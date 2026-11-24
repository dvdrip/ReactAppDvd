using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace ReactAppDvd.Server.Tests;

public sealed class MealPlanApiTests
{
    [Fact]
    public async Task Meal_plan_api_requires_authentication_and_isolates_users()
    {
        using var factory = new MealPlanApiFactory();
        using var anonymousClient = factory.CreateClient();

        var unauthorized = await anonymousClient.GetAsync("/api/meal-plans");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthorized.StatusCode);

        using var alice = factory.CreateClient();
        await RegisterAsync(alice, "alice");
        var createResponse = await alice.PostAsJsonAsync(
            "/api/meal-plans",
            new { category = "breakfast" });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        Assert.Equal("/api/meal-plans/breakfast", createResponse.Headers.Location?.OriginalString);

        var duplicateWeekdayResponse = await alice.PutAsJsonAsync(
            "/api/meal-plans/breakfast",
            new
            {
                meals = new[]
                {
                    NewMeal("monday", "First meal"),
                    NewMeal("monday", "Duplicate weekday")
                }
            });
        Assert.Equal(HttpStatusCode.BadRequest, duplicateWeekdayResponse.StatusCode);

        var updateResponse = await alice.PutAsJsonAsync(
            "/api/meal-plans/breakfast",
            new
            {
                meals = new[]
                {
                    new
                    {
                        day = "monday",
                        name = "Oat bowl",
                        imageId = "photo-123",
                        imageAlt = "A bowl of oats",
                        prepTime = "10 minutes",
                        ingredients = new[] { "Oats", "Milk" },
                        steps = new[] { "Mix and serve." }
                    }
                }
            });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        using var bob = factory.CreateClient();
        await RegisterAsync(bob, "bob");
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync("/api/meal-plans/breakfast")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await bob.PostAsJsonAsync(
            "/api/meal-plans",
            new { category = "breakfast" })).StatusCode);

        var alicePlan = await alice.GetFromJsonAsync<JsonElement>("/api/meal-plans/breakfast");
        Assert.Equal("Oat bowl", alicePlan.GetProperty("meals")[0].GetProperty("name").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await alice.DeleteAsync("/api/meal-plans/breakfast")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await bob.GetAsync("/api/meal-plans/breakfast")).StatusCode);
    }

    [Fact]
    public async Task Meal_plan_api_returns_conflict_and_validation_errors()
    {
        using var factory = new MealPlanApiFactory();
        using var alice = factory.CreateClient();
        await RegisterAsync(alice, "alice");

        Assert.Equal(HttpStatusCode.Created, (await alice.PostAsJsonAsync(
            "/api/meal-plans",
            new { category = "breakfast" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await alice.PostAsJsonAsync(
            "/api/meal-plans",
            new { category = "breakfast" })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest, (await alice.PostAsJsonAsync(
            "/api/meal-plans",
            new { category = "snacks" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await alice.GetAsync(
            "/api/meal-plans/snacks")).StatusCode);

        var invalidDay = await alice.PutAsJsonAsync(
            "/api/meal-plans/breakfast",
            new { meals = new[] { NewMeal("saturday", "Not a weekday") } });
        Assert.Equal(HttpStatusCode.BadRequest, invalidDay.StatusCode);

        var malformed = await alice.PutAsJsonAsync(
            "/api/meal-plans/breakfast",
            new { meals = new[] { NewMeal("monday", " ") } });
        Assert.Equal(HttpStatusCode.BadRequest, malformed.StatusCode);

        var missingMeals = await alice.PutAsJsonAsync(
            "/api/meal-plans/breakfast",
            new { meals = (object?)null });
        Assert.Equal(HttpStatusCode.BadRequest, missingMeals.StatusCode);
    }

    [Fact]
    public async Task Meal_plan_api_rejects_null_meal_items_and_missing_days_without_exceptions()
    {
        using var factory = new MealPlanApiFactory();
        using var alice = factory.CreateClient();
        await RegisterAsync(alice, "alice");
        Assert.Equal(HttpStatusCode.Created, (await alice.PostAsJsonAsync(
            "/api/meal-plans",
            new { category = "breakfast" })).StatusCode);

        var nullMealResponse = await alice.PutAsJsonAsync(
            "/api/meal-plans/breakfast",
            new { meals = new object?[] { null } });
        Assert.Equal(HttpStatusCode.BadRequest, nullMealResponse.StatusCode);

        var missingDayResponse = await alice.PutAsJsonAsync(
            "/api/meal-plans/breakfast",
            new
            {
                meals = new[]
                {
                    new
                    {
                        name = "Oat bowl",
                        imageId = "raw-unsplash-id",
                        imageAlt = "A bowl of oats",
                        prepTime = "10 minutes",
                        ingredients = new[] { "Oats" },
                        steps = new[] { "Mix and serve." }
                    }
                }
            });
        Assert.Equal(HttpStatusCode.BadRequest, missingDayResponse.StatusCode);
    }

    [Fact]
    public async Task Meal_plan_api_round_trips_raw_image_id()
    {
        using var factory = new MealPlanApiFactory();
        using var alice = factory.CreateClient();
        await RegisterAsync(alice, "alice");
        Assert.Equal(HttpStatusCode.Created, (await alice.PostAsJsonAsync(
            "/api/meal-plans",
            new { category = "lunch" })).StatusCode);

        var updateResponse = await alice.PutAsJsonAsync(
            "/api/meal-plans/lunch",
            new
            {
                meals = new[]
                {
                    new
                    {
                        day = "tuesday",
                        name = "Garden salad",
                        imageId = "123abc",
                        imageAlt = "A garden salad",
                        prepTime = "10 minutes",
                        ingredients = new[] { "Lettuce" },
                        steps = new[] { "Toss." }
                    }
                }
            });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var plan = await alice.GetFromJsonAsync<JsonElement>("/api/meal-plans/lunch");
        Assert.Equal("123abc", plan.GetProperty("meals")[0].GetProperty("imageId").GetString());
    }

    [Fact]
    public async Task Meal_plan_api_deletion_is_isolated_by_owner()
    {
        using var factory = new MealPlanApiFactory();
        using var alice = factory.CreateClient();
        await RegisterAsync(alice, "alice");
        Assert.Equal(HttpStatusCode.Created, (await alice.PostAsJsonAsync(
            "/api/meal-plans",
            new { category = "lunch" })).StatusCode);

        using var bob = factory.CreateClient();
        await RegisterAsync(bob, "bob");

        Assert.Equal(HttpStatusCode.NotFound, (await bob.DeleteAsync(
            "/api/meal-plans/lunch")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await alice.GetAsync(
            "/api/meal-plans/lunch")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await alice.DeleteAsync(
            "/api/meal-plans/lunch")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await alice.GetAsync(
            "/api/meal-plans/lunch")).StatusCode);
    }

    [Fact]
    public async Task Registration_failures_return_the_same_generic_problem_without_identity_errors()
    {
        using var factory = new MealPlanApiFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "existing");

        var duplicateUsername = await client.PostAsJsonAsync(
            "/register",
            new
            {
                email = "new@example.test",
                username = "existing",
                password = "Example123!"
            });
        var duplicateEmail = await client.PostAsJsonAsync(
            "/register",
            new
            {
                email = "existing@example.test",
                username = "new-user",
                password = "Example123!"
            });
        var invalidPassword = await client.PostAsJsonAsync(
            "/register",
            new
            {
                email = "another@example.test",
                username = "another-user",
                password = "short"
            });

        Assert.Equal(HttpStatusCode.BadRequest, duplicateUsername.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, duplicateEmail.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, invalidPassword.StatusCode);
        var genericResponse = await duplicateUsername.Content.ReadAsStringAsync();
        Assert.Equal(genericResponse, await duplicateEmail.Content.ReadAsStringAsync());
        Assert.Equal(genericResponse, await invalidPassword.Content.ReadAsStringAsync());
        Assert.Contains("Account could not be created.", genericResponse);
        Assert.DoesNotContain("DuplicateUserName", genericResponse);
        Assert.DoesNotContain("DuplicateEmail", genericResponse);
        Assert.DoesNotContain("PasswordTooShort", genericResponse);
        Assert.DoesNotContain("already taken", genericResponse);
    }

    private static object NewMeal(string day, string name) => new
    {
        day,
        name,
        imageId = "photo-123",
        imageAlt = "A test meal",
        prepTime = "10 minutes",
        ingredients = new[] { "Oats" },
        steps = new[] { "Prepare the meal." }
    };

    private static async Task RegisterAsync(HttpClient client, string username)
    {
        var response = await client.PostAsJsonAsync(
            "/register",
            new
            {
                email = $"{username}@example.test",
                username,
                password = "Example123!"
            });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private sealed class MealPlanApiFactory : WebApplicationFactory<Program>
    {
        private readonly string _connectionString = $"Data Source=MealPlans-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
        private readonly SqliteConnection _connection;

        public MealPlanApiFactory()
        {
            _connection = new SqliteConnection(_connectionString);
            _connection.Open();
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("ConnectionStrings:DefaultConnection", _connectionString);
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing)
            {
                _connection.Dispose();
            }
        }
    }
}
