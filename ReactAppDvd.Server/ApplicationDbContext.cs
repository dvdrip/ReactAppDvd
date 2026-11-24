using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using ReactAppDvd.Server.Models;
using System.Text.Json;

namespace ReactAppDvd.Server;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<IdentityUser>(options)
{
    public DbSet<MealPlan> MealPlans => Set<MealPlan>();
    public DbSet<Meal> Meals => Set<Meal>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<MealPlan>(entity =>
        {
            entity.ToTable("MealPlans", table =>
                table.HasCheckConstraint(
                    "CK_MealPlans_Category",
                    "\"Category\" IN ('Breakfast', 'Lunch', 'Dinner')"));
            entity.HasKey(plan => plan.Id);
            entity.Property(plan => plan.Category)
                .HasConversion<string>()
                .IsRequired();
            entity.Property(plan => plan.UserId).IsRequired();
            entity.HasIndex(plan => new { plan.UserId, plan.Category }).IsUnique();
            entity.HasOne<IdentityUser>()
                .WithMany()
                .HasForeignKey(plan => plan.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(plan => plan.Meals)
                .WithOne(meal => meal.MealPlan)
                .HasForeignKey(meal => meal.MealPlanId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        var stringListConverter = new ValueConverter<List<string>, string>(
            values => JsonSerializer.Serialize(values, (JsonSerializerOptions?)null),
            json => JsonSerializer.Deserialize<List<string>>(json, (JsonSerializerOptions?)null) ?? new List<string>());
        var stringListComparer = new ValueComparer<List<string>>(
            (left, right) => left!.SequenceEqual(right!),
            values => values.Aggregate(0, (hash, value) => HashCode.Combine(hash, value.GetHashCode())),
            values => values.ToList());

        builder.Entity<Meal>(entity =>
        {
            entity.ToTable("Meals", table =>
                table.HasCheckConstraint(
                    "CK_Meals_Day",
                    "\"Day\" IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')"));
            entity.HasKey(meal => meal.Id);
            entity.Property(meal => meal.Day)
                .HasConversion<string>()
                .IsRequired();
            entity.Property(meal => meal.Name).HasMaxLength(100).IsRequired();
            entity.Property(meal => meal.ImageId).HasMaxLength(100).IsRequired();
            entity.Property(meal => meal.ImageAlt).HasMaxLength(200).IsRequired();
            entity.Property(meal => meal.PrepTime).HasMaxLength(100).IsRequired();
            entity.Property(meal => meal.Ingredients)
                .HasConversion(stringListConverter)
                .Metadata.SetValueComparer(stringListComparer);
            entity.Property(meal => meal.Steps)
                .HasConversion(stringListConverter)
                .Metadata.SetValueComparer(stringListComparer);
            entity.HasIndex(meal => new { meal.MealPlanId, meal.Day }).IsUnique();
        });
    }
}
