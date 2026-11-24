using Microsoft.EntityFrameworkCore;
using ReactAppDvd.Server.Models;

namespace ReactAppDvd.Server.Services;

public sealed class MealPlanService(ApplicationDbContext dbContext) : IMealPlanService
{
    public async Task<IReadOnlyList<MealPlanResponse>> GetAllAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        var plans = await dbContext.MealPlans
            .AsNoTracking()
            .Where(plan => plan.UserId == userId)
            .Include(plan => plan.Meals)
            .OrderBy(plan => plan.Category)
            .ToListAsync(cancellationToken);

        return plans.Select(ToResponse).ToList();
    }

    public async Task<MealPlanResponse?> GetAsync(
        string userId,
        MealCategory category,
        CancellationToken cancellationToken)
    {
        var plan = await dbContext.MealPlans
            .AsNoTracking()
            .Where(candidate => candidate.UserId == userId && candidate.Category == category)
            .Include(candidate => candidate.Meals)
            .SingleOrDefaultAsync(cancellationToken);

        return plan is null ? null : ToResponse(plan);
    }

    public async Task<MealPlanResponse?> CreateAsync(
        string userId,
        MealCategory category,
        CancellationToken cancellationToken)
    {
        if (await dbContext.MealPlans.AnyAsync(
                plan => plan.UserId == userId && plan.Category == category,
                cancellationToken))
        {
            return null;
        }

        var plan = new MealPlan { UserId = userId, Category = category };
        dbContext.MealPlans.Add(plan);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return ToResponse(plan);
        }
        catch (DbUpdateException exception) when (IsSqliteConstraintViolation(exception))
        {
            // The unique index is authoritative if two creates race after the pre-check.
            return null;
        }
    }

    public async Task<MealPlanResponse?> ReplaceMealsAsync(
        string userId,
        MealCategory category,
        IReadOnlyList<MealRequest> meals,
        CancellationToken cancellationToken)
    {
        var plan = await dbContext.MealPlans
            .Where(candidate => candidate.UserId == userId && candidate.Category == category)
            .Include(candidate => candidate.Meals)
            .SingleOrDefaultAsync(cancellationToken);
        if (plan is null)
        {
            return null;
        }

        dbContext.Meals.RemoveRange(plan.Meals);
        plan.Meals = meals.Select(request => new Meal
        {
            Day = Enum.Parse<MealWeekday>(request.Day, ignoreCase: true),
            Name = request.Name.Trim(),
            ImageId = request.ImageId.Trim(),
            ImageAlt = request.ImageAlt.Trim(),
            PrepTime = request.PrepTime.Trim(),
            Ingredients = request.Ingredients.Select(value => value.Trim()).ToList(),
            Steps = request.Steps.Select(value => value.Trim()).ToList()
        }).ToList();

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(plan);
    }

    public async Task<bool> DeleteAsync(
        string userId,
        MealCategory category,
        CancellationToken cancellationToken)
    {
        var plan = await dbContext.MealPlans
            .SingleOrDefaultAsync(
                candidate => candidate.UserId == userId && candidate.Category == category,
                cancellationToken);
        if (plan is null)
        {
            return false;
        }

        dbContext.MealPlans.Remove(plan);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static MealPlanResponse ToResponse(MealPlan plan) =>
        new(
            plan.Id,
            plan.Category,
            plan.Meals
                .OrderBy(meal => meal.Day)
                .Select(meal => new MealResponse(
                    meal.Id,
                    meal.Day,
                    meal.Name,
                    meal.ImageId,
                    meal.ImageAlt,
                    meal.PrepTime,
                    meal.Ingredients,
                    meal.Steps))
                .ToList());

    private static bool IsSqliteConstraintViolation(DbUpdateException exception) =>
        exception.InnerException is Microsoft.Data.Sqlite.SqliteException
        {
            SqliteErrorCode: 19
        };
}
