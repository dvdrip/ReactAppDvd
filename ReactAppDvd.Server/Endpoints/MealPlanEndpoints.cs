using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using ReactAppDvd.Server.Models;
using ReactAppDvd.Server.Services;
using System.Security.Claims;

namespace ReactAppDvd.Server.Endpoints;

public static class MealPlanEndpoints
{
    public static WebApplication MapMealPlanEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/meal-plans")
            .RequireAuthorization();

        group.MapGet("", async Task<Results<Ok<IReadOnlyList<MealPlanResponse>>, UnauthorizedHttpResult>> (
            HttpContext httpContext,
            IMealPlanService service,
            CancellationToken cancellationToken) =>
        {
            var userId = GetUserId(httpContext);
            return userId is null
                ? TypedResults.Unauthorized()
                : TypedResults.Ok(await service.GetAllAsync(userId, cancellationToken));
        })
            .WithName("GetMealPlans")
            .WithSummary("Gets the authenticated user's meal plans")
            .WithDescription("Returns only plans owned by the authenticated user; an empty account returns an empty list.")
            .Produces<IReadOnlyList<MealPlanResponse>>();

        group.MapGet("/{category}", async Task<Results<
            Ok<MealPlanResponse>,
            NotFound,
            BadRequest<ValidationProblemDetails>,
            UnauthorizedHttpResult>> (
            string category,
            HttpContext httpContext,
            IMealPlanService service,
            CancellationToken cancellationToken) =>
        {
            if (!TryParseCategory(category, out var mealCategory))
            {
                return TypedResults.BadRequest(CategoryValidationProblem());
            }

            var userId = GetUserId(httpContext);
            if (userId is null)
            {
                return TypedResults.Unauthorized();
            }

            var plan = await service.GetAsync(userId, mealCategory, cancellationToken);
            return plan is null ? TypedResults.NotFound() : TypedResults.Ok(plan);
        })
            .WithName("GetMealPlan")
            .WithSummary("Gets one category plan")
            .WithDescription("Returns the requested plan only when it belongs to the authenticated user.")
            .Produces<MealPlanResponse>()
            .Produces(StatusCodes.Status404NotFound)
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest);

        group.MapPost("", async Task<Results<
            Created<MealPlanResponse>,
            Conflict<ProblemDetails>,
            BadRequest<ProblemDetails>,
            UnauthorizedHttpResult>> (
            CreateMealPlanRequest request,
            HttpContext httpContext,
            IMealPlanService service,
            CancellationToken cancellationToken) =>
        {
            if (!TryParseCategory(request.Category, out var category))
            {
                return TypedResults.BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Category must be breakfast, lunch, or dinner."
                });
            }

            var userId = GetUserId(httpContext);
            if (userId is null)
            {
                return TypedResults.Unauthorized();
            }

            var plan = await service.CreateAsync(userId, category, cancellationToken);
            if (plan is null)
            {
                return TypedResults.Conflict(new ProblemDetails
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "A plan for this category already exists."
                });
            }

            var categoryPath = category.ToString().ToLowerInvariant();
            return TypedResults.Created($"/api/meal-plans/{categoryPath}", plan);
        })
            .WithName("CreateMealPlan")
            .WithSummary("Creates an empty plan for a meal category")
            .WithDescription("Each authenticated user can own at most one plan per category.")
            .Produces<MealPlanResponse>(StatusCodes.Status201Created)
            .Produces<ProblemDetails>(StatusCodes.Status409Conflict)
            .Produces<ProblemDetails>(StatusCodes.Status400BadRequest);

        group.MapPut("/{category}", async Task<Results<
            Ok<MealPlanResponse>,
            NotFound,
            BadRequest<ValidationProblemDetails>,
            UnauthorizedHttpResult>> (
            string category,
            UpdateMealPlanRequest request,
            HttpContext httpContext,
            IMealPlanService service,
            CancellationToken cancellationToken) =>
        {
            if (!TryParseCategory(category, out var mealCategory))
            {
                return TypedResults.BadRequest(CategoryValidationProblem());
            }

            var validationProblem = ValidateMeals(request.Meals);
            if (validationProblem is not null)
            {
                return TypedResults.BadRequest(validationProblem);
            }

            var userId = GetUserId(httpContext);
            if (userId is null)
            {
                return TypedResults.Unauthorized();
            }

            var plan = await service.ReplaceMealsAsync(
                userId,
                mealCategory,
                request.Meals,
                cancellationToken);
            return plan is null ? TypedResults.NotFound() : TypedResults.Ok(plan);
        })
            .WithName("ReplaceMealPlanMeals")
            .WithSummary("Replaces all weekday meals in a category plan")
            .WithDescription("Accepts zero to five meals, with at most one meal for each Monday–Friday weekday.")
            .Produces<MealPlanResponse>()
            .Produces(StatusCodes.Status404NotFound)
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest);

        group.MapDelete("/{category}", async Task<Results<
            NoContent,
            NotFound,
            BadRequest<ValidationProblemDetails>,
            UnauthorizedHttpResult>> (
            string category,
            HttpContext httpContext,
            IMealPlanService service,
            CancellationToken cancellationToken) =>
        {
            if (!TryParseCategory(category, out var mealCategory))
            {
                return TypedResults.BadRequest(CategoryValidationProblem());
            }

            var userId = GetUserId(httpContext);
            if (userId is null)
            {
                return TypedResults.Unauthorized();
            }

            return await service.DeleteAsync(userId, mealCategory, cancellationToken)
                ? TypedResults.NoContent()
                : TypedResults.NotFound();
        })
            .WithName("DeleteMealPlan")
            .WithSummary("Deletes a category plan and its meals")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest);

        return app;
    }

    private static string? GetUserId(HttpContext httpContext) =>
        httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);

    private static bool TryParseCategory(string? value, out MealCategory category)
    {
        category = value?.ToLowerInvariant() switch
        {
            "breakfast" => MealCategory.Breakfast,
            "lunch" => MealCategory.Lunch,
            "dinner" => MealCategory.Dinner,
            _ => (MealCategory)(-1)
        };
        return Enum.IsDefined(category);
    }

    private static ValidationProblemDetails CategoryValidationProblem() =>
        new(new Dictionary<string, string[]>
        {
            ["category"] = ["Category must be breakfast, lunch, or dinner."]
        });

    private static ValidationProblemDetails? ValidateMeals(IReadOnlyCollection<MealRequest>? meals)
    {
        var errors = new Dictionary<string, string[]>();
        if (meals is null)
        {
            errors["meals"] = ["Meals is required."];
            return new ValidationProblemDetails(errors);
        }

        if (meals.Any(meal => meal is null))
        {
            errors["meals"] = ["Meals must not contain null items."];
        }

        if (meals.Count > 5)
        {
            errors["meals"] = ["A weekday plan can contain no more than five meals."];
        }

        if (meals.Where(meal => meal is not null)
            .Any(meal => string.IsNullOrWhiteSpace(meal!.Day)))
        {
            errors["meals"] = ["Every meal must specify a Monday–Friday weekday."];
        }

        var nonNullDays = meals
            .Where(meal => meal is not null && !string.IsNullOrWhiteSpace(meal.Day))
            .Select(meal => meal!.Day.Trim().ToLowerInvariant())
            .ToList();
        if (nonNullDays.Distinct().Count() != nonNullDays.Count)
        {
            errors["meals"] = ["Only one meal may be assigned to each weekday in a category plan."];
        }

        var index = 0;
        foreach (var meal in meals)
        {
            var prefix = $"meals[{index}]";
            if (meal is null)
            {
                index++;
                continue;
            }

            if (!TryParseWeekday(meal.Day, out _))
            {
                errors[$"{prefix}.day"] = ["Day must be Monday through Friday."];
            }

            ValidateText(meal.Name, 100, $"{prefix}.name", errors);
            ValidateText(meal.ImageId, 100, $"{prefix}.imageId", errors);
            ValidateText(meal.ImageAlt, 200, $"{prefix}.imageAlt", errors);
            ValidateText(meal.PrepTime, 100, $"{prefix}.prepTime", errors);
            ValidateTextList(meal.Ingredients, 30, 100, $"{prefix}.ingredients", errors);
            ValidateTextList(meal.Steps, 20, 500, $"{prefix}.steps", errors);
            index++;
        }

        return errors.Count == 0 ? null : new ValidationProblemDetails(errors);
    }

    private static bool TryParseWeekday(string? value, out MealWeekday day)
    {
        day = value?.ToLowerInvariant() switch
        {
            "monday" => MealWeekday.Monday,
            "tuesday" => MealWeekday.Tuesday,
            "wednesday" => MealWeekday.Wednesday,
            "thursday" => MealWeekday.Thursday,
            "friday" => MealWeekday.Friday,
            _ => (MealWeekday)(-1)
        };
        return Enum.IsDefined(day);
    }

    private static void ValidateText(
        string? value,
        int maxLength,
        string key,
        IDictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > maxLength)
        {
            errors[key] = [$"A non-empty value of at most {maxLength} characters is required."];
        }
    }

    private static void ValidateTextList(
        IReadOnlyCollection<string>? values,
        int maxItems,
        int maxLength,
        string key,
        IDictionary<string, string[]> errors)
    {
        if (values is null || values.Count == 0 || values.Count > maxItems
            || values.Any(value => string.IsNullOrWhiteSpace(value) || value.Trim().Length > maxLength))
        {
            errors[key] = [$"Provide 1 to {maxItems} non-empty values, each at most {maxLength} characters."];
        }
    }
}
