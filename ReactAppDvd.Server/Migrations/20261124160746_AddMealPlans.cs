using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReactAppDvd.Server.Migrations;

public partial class AddMealPlans : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Existing app.db files were created with EnsureCreated and therefore have the
        // complete Identity schema but no __EFMigrationsHistory. Conditional DDL allows
        // the initial migration to preserve those tables and account rows while also
        // initializing a fresh database.
        migrationBuilder.Sql(
            """
            CREATE TABLE IF NOT EXISTS "AspNetRoles" (
                "Id" TEXT NOT NULL CONSTRAINT "PK_AspNetRoles" PRIMARY KEY,
                "Name" TEXT NULL,
                "NormalizedName" TEXT NULL,
                "ConcurrencyStamp" TEXT NULL
            );
            CREATE TABLE IF NOT EXISTS "AspNetUsers" (
                "Id" TEXT NOT NULL CONSTRAINT "PK_AspNetUsers" PRIMARY KEY,
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
            CREATE TABLE IF NOT EXISTS "AspNetRoleClaims" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY AUTOINCREMENT,
                "RoleId" TEXT NOT NULL,
                "ClaimType" TEXT NULL,
                "ClaimValue" TEXT NULL,
                CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId"
                    FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS "AspNetUserClaims" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY AUTOINCREMENT,
                "UserId" TEXT NOT NULL,
                "ClaimType" TEXT NULL,
                "ClaimValue" TEXT NULL,
                CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId"
                    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS "AspNetUserLogins" (
                "LoginProvider" TEXT NOT NULL,
                "ProviderKey" TEXT NOT NULL,
                "ProviderDisplayName" TEXT NULL,
                "UserId" TEXT NOT NULL,
                CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
                CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId"
                    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS "AspNetUserRoles" (
                "UserId" TEXT NOT NULL,
                "RoleId" TEXT NOT NULL,
                CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
                CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId"
                    FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId"
                    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS "AspNetUserTokens" (
                "UserId" TEXT NOT NULL,
                "LoginProvider" TEXT NOT NULL,
                "Name" TEXT NOT NULL,
                "Value" TEXT NULL,
                CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
                CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId"
                    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "RoleNameIndex"
                ON "AspNetRoles" ("NormalizedName");
            CREATE INDEX IF NOT EXISTS "IX_AspNetRoleClaims_RoleId"
                ON "AspNetRoleClaims" ("RoleId");
            CREATE INDEX IF NOT EXISTS "EmailIndex"
                ON "AspNetUsers" ("NormalizedEmail");
            CREATE UNIQUE INDEX IF NOT EXISTS "UserNameIndex"
                ON "AspNetUsers" ("NormalizedUserName");
            CREATE INDEX IF NOT EXISTS "IX_AspNetUserClaims_UserId"
                ON "AspNetUserClaims" ("UserId");
            CREATE INDEX IF NOT EXISTS "IX_AspNetUserLogins_UserId"
                ON "AspNetUserLogins" ("UserId");
            CREATE INDEX IF NOT EXISTS "IX_AspNetUserRoles_RoleId"
                ON "AspNetUserRoles" ("RoleId");
            CREATE TABLE IF NOT EXISTS "MealPlans" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_MealPlans" PRIMARY KEY AUTOINCREMENT,
                "UserId" TEXT NOT NULL,
                "Category" TEXT NOT NULL,
                CONSTRAINT "CK_MealPlans_Category"
                    CHECK ("Category" IN ('Breakfast', 'Lunch', 'Dinner')),
                CONSTRAINT "FK_MealPlans_AspNetUsers_UserId"
                    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_MealPlans_UserId_Category"
                ON "MealPlans" ("UserId", "Category");
            CREATE TABLE IF NOT EXISTS "Meals" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_Meals" PRIMARY KEY AUTOINCREMENT,
                "MealPlanId" INTEGER NOT NULL,
                "Day" TEXT NOT NULL,
                "Name" TEXT NOT NULL,
                "ImageId" TEXT NOT NULL,
                "ImageAlt" TEXT NOT NULL,
                "PrepTime" TEXT NOT NULL,
                "Ingredients" TEXT NOT NULL,
                "Steps" TEXT NOT NULL,
                CONSTRAINT "CK_Meals_Day"
                    CHECK ("Day" IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
                CONSTRAINT "FK_Meals_MealPlans_MealPlanId"
                    FOREIGN KEY ("MealPlanId") REFERENCES "MealPlans" ("Id") ON DELETE CASCADE
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Meals_MealPlanId_Day"
                ON "Meals" ("MealPlanId", "Day");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Do not drop Identity tables: accounts were created before this migration existed.
        migrationBuilder.Sql(
            """
            DROP TABLE IF EXISTS "Meals";
            DROP TABLE IF EXISTS "MealPlans";
            """);
    }
}
