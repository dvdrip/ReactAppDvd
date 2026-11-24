namespace ReactAppDvd.Server.Models;

public enum MealWeekday
{
    Monday,
    Tuesday,
    Wednesday,
    Thursday,
    Friday
}

public sealed class Meal
{
    public int Id { get; set; }
    public int MealPlanId { get; set; }
    public MealPlan MealPlan { get; set; } = null!;
    public MealWeekday Day { get; set; }
    public required string Name { get; set; }
    public required string ImageId { get; set; }
    public required string ImageAlt { get; set; }
    public required string PrepTime { get; set; }
    public List<string> Ingredients { get; set; } = [];
    public List<string> Steps { get; set; } = [];
}
