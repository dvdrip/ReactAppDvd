namespace ReactAppDvd.Server.Models;

public enum MealCategory
{
    Breakfast,
    Lunch,
    Dinner
}

public sealed class MealPlan
{
    public int Id { get; set; }
    public required string UserId { get; set; }
    public MealCategory Category { get; set; }
    public List<Meal> Meals { get; set; } = [];
}
