using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using ReactAppDvd.Server;
using ReactAppDvd.Server.Models;
using ReactAppDvd.Server.Services;
using Xunit;

namespace ReactAppDvd.Server.Tests;

public sealed class MealPlanPersistenceTests
{
    [Fact]
    public async Task Migration_initializes_a_fresh_database_without_sample_plans()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var context = CreateContext(connection);

        await DatabaseInitializer.MigrateAsync(context, CancellationToken.None);

        Assert.Empty(await context.Users.ToListAsync());
        Assert.Empty(await context.MealPlans.ToListAsync());
        Assert.True(await context.Database.CanConnectAsync());
    }

    [Fact]
    public async Task Migration_preserves_accounts_in_an_existing_EnsureCreated_database()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var legacyOptions = new DbContextOptionsBuilder<LegacyIdentityDbContext>()
            .UseSqlite(connection)
            .Options;

        await using (var legacyContext = new LegacyIdentityDbContext(legacyOptions))
        {
            await legacyContext.Database.EnsureCreatedAsync();
            legacyContext.Users.Add(new IdentityUser
            {
                Id = "existing-user",
                UserName = "existing-user",
                NormalizedUserName = "EXISTING-USER",
                Email = "existing@example.test",
                NormalizedEmail = "EXISTING@EXAMPLE.TEST",
                PasswordHash = "test-hash"
            });
            await legacyContext.SaveChangesAsync();
        }

        await using var context = CreateContext(connection);
        await DatabaseInitializer.MigrateAsync(context, CancellationToken.None);

        var preservedUser = await context.Users.SingleAsync();
        Assert.Equal("existing-user", preservedUser.Id);
        Assert.Equal("test-hash", preservedUser.PasswordHash);
        Assert.Empty(await context.MealPlans.ToListAsync());
    }

    [Fact]
    public async Task Migration_rejects_legacy_schema_with_a_missing_identity_index()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var legacyOptions = new DbContextOptionsBuilder<LegacyIdentityDbContext>()
            .UseSqlite(connection)
            .Options;

        await using (var legacyContext = new LegacyIdentityDbContext(legacyOptions))
        {
            await legacyContext.Database.EnsureCreatedAsync();
            await legacyContext.Database.ExecuteSqlRawAsync(
                "DROP INDEX \"RoleNameIndex\"");
        }

        await using var context = CreateContext(connection);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => DatabaseInitializer.MigrateAsync(context, CancellationToken.None));
    }

    [Fact]
    public async Task Migration_rejects_legacy_schema_with_wrong_column_types()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var legacyOptions = new DbContextOptionsBuilder<LegacyIdentityDbContext>()
            .UseSqlite(connection)
            .Options;

        await using (var legacyContext = new LegacyIdentityDbContext(legacyOptions))
        {
            await legacyContext.Database.EnsureCreatedAsync();
            await legacyContext.Database.ExecuteSqlRawAsync(
                """
                ALTER TABLE "AspNetUsers" RENAME TO "AspNetUsersCompatibleCopy";
                CREATE TABLE "AspNetUsers" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_AspNetUsers" PRIMARY KEY,
                    "UserName" TEXT NULL,
                    "NormalizedUserName" TEXT NULL,
                    "Email" TEXT NULL,
                    "NormalizedEmail" TEXT NULL,
                    "EmailConfirmed" INTEGER NOT NULL,
                    "PasswordHash" TEXT NULL,
                    "SecurityStamp" TEXT NULL,
                    "ConcurrencyStamp" TEXT NULL,
                    "PhoneNumber" TEXT NULL,
                    "PhoneNumberConfirmed" INTEGER NOT NULL,
                    "TwoFactorEnabled" INTEGER NOT NULL,
                    "LockoutEnd" TEXT NULL,
                    "LockoutEnabled" INTEGER NOT NULL,
                    "AccessFailedCount" INTEGER NOT NULL
                );
                """);
        }

        await using var context = CreateContext(connection);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => DatabaseInitializer.MigrateAsync(context, CancellationToken.None));
    }

    [Fact]
    public async Task Plans_are_scoped_by_owner_and_unique_per_category_with_unique_weekdays()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var context = CreateContext(connection);
        await DatabaseInitializer.MigrateAsync(context, CancellationToken.None);
        context.Users.AddRange(
            new IdentityUser { Id = "user-one", UserName = "user-one" },
            new IdentityUser { Id = "user-two", UserName = "user-two" });
        await context.SaveChangesAsync();
        var service = new MealPlanService(context);

        var userOnePlan = await service.CreateAsync("user-one", MealCategory.Breakfast, CancellationToken.None);
        var userTwoPlan = await service.CreateAsync("user-two", MealCategory.Breakfast, CancellationToken.None);

        Assert.NotNull(userOnePlan);
        Assert.NotNull(userTwoPlan);
        Assert.Null(await service.CreateAsync("user-one", MealCategory.Breakfast, CancellationToken.None));
        Assert.Null(await service.GetAsync("user-two", MealCategory.Lunch, CancellationToken.None));

        var meal = new MealRequest
        {
            Day = "monday",
            Name = "Oat bowl",
            ImageId = "123abc",
            ImageAlt = "A bowl of oats",
            PrepTime = "10 minutes",
            Ingredients = ["Oats", "Milk"],
            Steps = ["Mix and serve."]
        };
        var updated = await service.ReplaceMealsAsync(
            "user-one",
            MealCategory.Breakfast,
            [meal],
            CancellationToken.None);

        Assert.NotNull(updated);
        Assert.Equal("123abc", updated.Meals.Single().ImageId);
        Assert.Equal(["Oats", "Milk"], updated.Meals.Single().Ingredients);
        Assert.Equal(["Mix and serve."], updated.Meals.Single().Steps);
        Assert.Null(await service.ReplaceMealsAsync(
            "user-two",
            MealCategory.Lunch,
            [meal],
            CancellationToken.None));

        var planId = userOnePlan.Id;
        await Assert.ThrowsAsync<SqliteException>(() => context.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "Meals"
                ("MealPlanId", "Day", "Name", "ImageId", "ImageAlt", "PrepTime", "Ingredients", "Steps")
            VALUES ({0}, 'Monday', 'Duplicate', 'photo-456', 'Duplicate meal', '5 minutes', '[]', '[]')
            """,
            planId));

        Assert.True(await service.DeleteAsync("user-one", MealCategory.Breakfast, CancellationToken.None));
        Assert.NotNull(await service.GetAsync("user-two", MealCategory.Breakfast, CancellationToken.None));
    }

    private static ApplicationDbContext CreateContext(SqliteConnection connection)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;
        return new ApplicationDbContext(options);
    }

    private sealed class LegacyIdentityDbContext(DbContextOptions<LegacyIdentityDbContext> options)
        : IdentityDbContext<IdentityUser>(options);
}
