using ReactAppDvd.Server.Models;

namespace ReactAppDvd.Server.Services;

public interface IMealPlanService
{
    Task<IReadOnlyList<MealPlanResponse>> GetAllAsync(string userId, CancellationToken cancellationToken);
    Task<MealPlanResponse?> GetAsync(
        string userId,
        MealCategory category,
        CancellationToken cancellationToken);
    Task<MealPlanResponse?> CreateAsync(
        string userId,
        MealCategory category,
        CancellationToken cancellationToken);
    Task<MealPlanResponse?> ReplaceMealsAsync(
        string userId,
        MealCategory category,
        IReadOnlyList<MealRequest> meals,
        CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string userId, MealCategory category, CancellationToken cancellationToken);
}
