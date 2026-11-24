using Microsoft.EntityFrameworkCore;
using System.Data.Common;

namespace ReactAppDvd.Server;

internal static class DatabaseInitializer
{
    private static readonly IReadOnlyDictionary<string, IReadOnlyDictionary<string, LegacyColumn>> LegacyIdentitySchema =
        new Dictionary<string, IReadOnlyDictionary<string, LegacyColumn>>(StringComparer.Ordinal)
        {
            ["AspNetRoles"] = Columns(
                ("Id", "TEXT", true, 1),
                ("Name", "TEXT", false, null),
                ("NormalizedName", "TEXT", false, null),
                ("ConcurrencyStamp", "TEXT", false, null)),
            ["AspNetUsers"] = Columns(
                ("Id", "TEXT", true, 1),
                ("UserName", "TEXT", false, null),
                ("NormalizedUserName", "TEXT", false, null),
                ("Email", "TEXT", false, null),
                ("NormalizedEmail", "TEXT", false, null),
                ("EmailConfirmed", "INTEGER", true, null),
                ("PasswordHash", "TEXT", false, null),
                ("SecurityStamp", "TEXT", false, null),
                ("ConcurrencyStamp", "TEXT", false, null),
                ("PhoneNumber", "TEXT", false, null),
                ("PhoneNumberConfirmed", "INTEGER", true, null),
                ("TwoFactorEnabled", "INTEGER", true, null),
                ("LockoutEnd", "TEXT", false, null),
                ("LockoutEnabled", "INTEGER", true, null),
                ("AccessFailedCount", "INTEGER", true, null)),
            ["AspNetRoleClaims"] = Columns(
                ("Id", "INTEGER", true, 1),
                ("RoleId", "TEXT", true, null),
                ("ClaimType", "TEXT", false, null),
                ("ClaimValue", "TEXT", false, null)),
            ["AspNetUserClaims"] = Columns(
                ("Id", "INTEGER", true, 1),
                ("UserId", "TEXT", true, null),
                ("ClaimType", "TEXT", false, null),
                ("ClaimValue", "TEXT", false, null)),
            ["AspNetUserLogins"] = Columns(
                ("LoginProvider", "TEXT", true, 1),
                ("ProviderKey", "TEXT", true, 2),
                ("ProviderDisplayName", "TEXT", false, null),
                ("UserId", "TEXT", true, null)),
            ["AspNetUserRoles"] = Columns(
                ("UserId", "TEXT", true, 1),
                ("RoleId", "TEXT", true, 2)),
            ["AspNetUserTokens"] = Columns(
                ("UserId", "TEXT", true, 1),
                ("LoginProvider", "TEXT", true, 2),
                ("Name", "TEXT", true, 3),
                ("Value", "TEXT", false, null))
        };

    private static readonly IReadOnlyDictionary<string, LegacyIndex[]> LegacyIdentityIndexes =
        new Dictionary<string, LegacyIndex[]>(StringComparer.Ordinal)
        {
            ["AspNetRoles"] =
            [
                new("RoleNameIndex", ["NormalizedName"], true)
            ],
            ["AspNetUsers"] =
            [
                new("EmailIndex", ["NormalizedEmail"], false),
                new("UserNameIndex", ["NormalizedUserName"], true)
            ],
            ["AspNetRoleClaims"] =
            [
                new("IX_AspNetRoleClaims_RoleId", ["RoleId"], false)
            ],
            ["AspNetUserClaims"] =
            [
                new("IX_AspNetUserClaims_UserId", ["UserId"], false)
            ],
            ["AspNetUserLogins"] =
            [
                new("IX_AspNetUserLogins_UserId", ["UserId"], false)
            ],
            ["AspNetUserRoles"] =
            [
                new("IX_AspNetUserRoles_RoleId", ["RoleId"], false)
            ]
        };

    private static readonly LegacyForeignKey[] LegacyIdentityForeignKeys =
    [
        new("AspNetRoleClaims", "RoleId", "AspNetRoles", "Id"),
        new("AspNetUserClaims", "UserId", "AspNetUsers", "Id"),
        new("AspNetUserLogins", "UserId", "AspNetUsers", "Id"),
        new("AspNetUserRoles", "UserId", "AspNetUsers", "Id"),
        new("AspNetUserRoles", "RoleId", "AspNetRoles", "Id"),
        new("AspNetUserTokens", "UserId", "AspNetUsers", "Id")
    ];

    public static async Task MigrateAsync(
        ApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var connection = dbContext.Database.GetDbConnection();
        var closeConnection = connection.State != System.Data.ConnectionState.Open;
        if (closeConnection)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            var tables = await GetTableNamesAsync(connection, cancellationToken);
            if (tables.Count > 0 && !tables.Contains("__EFMigrationsHistory"))
            {
                if (tables.Contains("MealPlans") || tables.Contains("Meals")
                    || !await HasCompatibleLegacyIdentitySchemaAsync(connection, tables, cancellationToken))
                {
                    throw new InvalidOperationException(
                        "The existing SQLite database is not a recognized EnsureCreated Identity database. "
                        + "No migrations were applied; inspect and back up the database before upgrading.");
                }
            }
        }
        finally
        {
            if (closeConnection)
            {
                await connection.CloseAsync();
            }
        }

        await dbContext.Database.MigrateAsync(cancellationToken);
    }

    private static async Task<HashSet<string>> GetTableNamesAsync(
        DbConnection connection,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText =
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'";

        var tables = new HashSet<string>(StringComparer.Ordinal);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            tables.Add(reader.GetString(0));
        }

        return tables;
    }

    private static async Task<bool> HasCompatibleLegacyIdentitySchemaAsync(
        DbConnection connection,
        HashSet<string> tables,
        CancellationToken cancellationToken)
    {
        foreach (var (table, expectedColumns) in LegacyIdentitySchema)
        {
            if (!tables.Contains(table))
            {
                return false;
            }

            await using var command = connection.CreateCommand();
            command.CommandText = $"PRAGMA table_info(\"{table}\")";
            var columns = new Dictionary<string, (string Type, bool NotNull, int PrimaryKey)>(
                StringComparer.Ordinal);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                columns.Add(
                    reader.GetString(1),
                    (reader.GetString(2).ToUpperInvariant(), reader.GetInt32(3) == 1, reader.GetInt32(5)));
            }

            foreach (var (name, expected) in expectedColumns)
            {
                if (!columns.TryGetValue(name, out var actual)
                    || !string.Equals(actual.Type, expected.Type, StringComparison.OrdinalIgnoreCase)
                    || (expected.Required && !actual.NotNull && actual.PrimaryKey == 0)
                    || (expected.PrimaryKeyOrder is not null && actual.PrimaryKey != expected.PrimaryKeyOrder))
                {
                    return false;
                }
            }

            if (!await HasCompatibleIndexesAsync(connection, table, cancellationToken))
            {
                return false;
            }
        }

        return await HasCompatibleForeignKeysAsync(connection, cancellationToken);
    }

    private static async Task<bool> HasCompatibleIndexesAsync(
        DbConnection connection,
        string table,
        CancellationToken cancellationToken)
    {
        if (!LegacyIdentityIndexes.TryGetValue(table, out var expectedIndexes))
        {
            return true;
        }

        await using var command = connection.CreateCommand();
        command.CommandText = $"PRAGMA index_list(\"{table}\")";
        var indexes = new Dictionary<string, bool>(StringComparer.Ordinal);
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                indexes.Add(reader.GetString(1), reader.GetInt32(2) == 1);
            }
        }

        foreach (var expected in expectedIndexes)
        {
            if (!indexes.TryGetValue(expected.Name, out var unique) || unique != expected.Unique)
            {
                return false;
            }

            await using var columnsCommand = connection.CreateCommand();
            columnsCommand.CommandText = $"PRAGMA index_info(\"{expected.Name}\")";
            var columns = new List<string>();
            await using (var reader = await columnsCommand.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    columns.Add(reader.GetString(2));
                }
            }

            if (!columns.SequenceEqual(expected.Columns, StringComparer.Ordinal))
            {
                return false;
            }
        }

        return true;
    }

    private static async Task<bool> HasCompatibleForeignKeysAsync(
        DbConnection connection,
        CancellationToken cancellationToken)
    {
        foreach (var expected in LegacyIdentityForeignKeys)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"PRAGMA foreign_key_list(\"{expected.Table}\")";
            var found = false;
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                if (string.Equals(reader.GetString(2), expected.PrincipalTable, StringComparison.Ordinal)
                    && string.Equals(reader.GetString(3), expected.Column, StringComparison.Ordinal)
                    && string.Equals(reader.GetString(4), expected.PrincipalColumn, StringComparison.Ordinal)
                    && string.Equals(reader.GetString(6), "CASCADE", StringComparison.OrdinalIgnoreCase))
                {
                    found = true;
                    break;
                }
            }

            if (!found)
            {
                return false;
            }
        }

        return true;
    }

    private static IReadOnlyDictionary<string, LegacyColumn> Columns(
        params (string Name, string Type, bool Required, int? PrimaryKeyOrder)[] columns) =>
        columns.ToDictionary(
            column => column.Name,
            column => new LegacyColumn(column.Type, column.Required, column.PrimaryKeyOrder),
            StringComparer.Ordinal);
}

internal sealed record LegacyColumn(string Type, bool Required, int? PrimaryKeyOrder);
internal sealed record LegacyIndex(string Name, string[] Columns, bool Unique);
internal sealed record LegacyForeignKey(
    string Table,
    string Column,
    string PrincipalTable,
    string PrincipalColumn);
