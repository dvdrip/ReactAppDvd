using ReactAppDvd.Server.Models;
using System.ComponentModel.DataAnnotations;

namespace ReactAppDvd.Server.Services;

/// <summary>Payload for creating a user's plan for a meal category.</summary>
public sealed record CreateMealPlanRequest
{
    [Required]
    public required string Category { get; init; }
}

/// <summary>Payload for replacing the weekday meals in a category plan.</summary>
public sealed record UpdateMealPlanRequest
{
    [Required]
    public required List<MealRequest> Meals { get; init; }
}

/// <summary>Editable recipe fields for one weekday meal.</summary>
public sealed record MealRequest
{
    [Required]
    public required string Day { get; init; }

    [Required, StringLength(100, MinimumLength = 1)]
    public required string Name { get; init; }

    [Required, StringLength(100, MinimumLength = 1)]
    public required string ImageId { get; init; }

    [Required, StringLength(200, MinimumLength = 1)]
    public required string ImageAlt { get; init; }

    [Required, StringLength(100, MinimumLength = 1)]
    public required string PrepTime { get; init; }

    [Required, MinLength(1), MaxLength(30)]
    public required List<string> Ingredients { get; init; }

    [Required, MinLength(1), MaxLength(20)]
    public required List<string> Steps { get; init; }
}

/// <summary>Represents a meal in a user's plan.</summary>
public sealed record MealResponse(
    int Id,
    MealWeekday Day,
    string Name,
    string ImageId,
    string ImageAlt,
    string PrepTime,
    IReadOnlyList<string> Ingredients,
    IReadOnlyList<string> Steps);

/// <summary>Represents one user's plan for a meal category.</summary>
public sealed record MealPlanResponse(
    int Id,
    MealCategory Category,
    IReadOnlyList<MealResponse> Meals);
