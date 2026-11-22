import { useState } from 'react';
import './MealPlanPage.css';

interface Meal {
    day: string;
    name: string;
    // Keep photo metadata with its recipe so the card stays data-driven.
    imageId: string;
    imageAlt: string;
    prepTime: string;
    ingredients: string[];
    steps: string[];
}

type MealType = 'breakfast' | 'lunch' | 'dinner';

const weekdayLunches: Meal[] = [
    {
        day: 'Monday',
        name: 'Mediterranean chickpea bowl',
        imageId: '1512621776951-a57141f2eefd',
        imageAlt: 'Colorful Mediterranean salad bowl',
        prepTime: '20 minutes',
        ingredients: ['Chickpeas', 'Quinoa', 'Cucumber', 'Cherry tomatoes', 'Feta', 'Lemon', 'Olive oil'],
        steps: [
            'Cook the quinoa according to the package directions, then fluff with a fork.',
            'Drain and rinse the chickpeas. Dice the cucumber and halve the cherry tomatoes.',
            'Divide the quinoa between bowls and top with chickpeas, cucumber, tomatoes, and crumbled feta.',
            'Finish with lemon juice and a drizzle of olive oil.'
        ]
    },
    {
        day: 'Tuesday',
        name: 'Turkey and avocado wrap',
        imageId: '1528735602780-2552fd46c7af',
        imageAlt: 'Freshly made sandwich wrap',
        prepTime: '10 minutes',
        ingredients: ['Whole-wheat tortilla', 'Turkey', 'Avocado', 'Spinach', 'Tomato', 'Greek yogurt'],
        steps: [
            'Spread Greek yogurt over the tortilla.',
            'Layer the turkey, spinach, sliced tomato, and avocado down the center.',
            'Fold in the sides, roll tightly, and slice in half.'
        ]
    },
    {
        day: 'Wednesday',
        name: 'Pesto pasta salad',
        imageId: '1473093295043-cdd812d0e601',
        imageAlt: 'Pasta served with fresh ingredients',
        prepTime: '20 minutes',
        ingredients: ['Whole-wheat pasta', 'Pesto', 'Cherry tomatoes', 'Spinach', 'Mozzarella'],
        steps: [
            'Cook the pasta according to the package directions. Drain and let it cool slightly.',
            'Toss the pasta with pesto until evenly coated.',
            'Fold in halved cherry tomatoes, spinach, and mozzarella. Serve warm or chilled.'
        ]
    },
    {
        day: 'Thursday',
        name: 'Black bean quesadilla',
        imageId: '1618040996337-56904b7850b9',
        imageAlt: 'Golden toasted quesadilla',
        prepTime: '20 minutes',
        ingredients: ['Black beans', 'Flour tortillas', 'Cheddar', 'Bell pepper', 'Corn', 'Salsa'],
        steps: [
            'Drain and rinse the black beans. Dice the bell pepper and grate the cheddar.',
            'Warm the beans, bell pepper, and corn in a skillet until the pepper softens.',
            'Add the filling and cheddar to one half of each tortilla, then fold it over.',
            'Cook in a dry skillet for 2–3 minutes per side until golden and the cheese melts. Serve with salsa.'
        ]
    },
    {
        day: 'Friday',
        name: 'Salmon rice bowl',
        imageId: '1519708227418-c8fd9a32b7a2',
        imageAlt: 'Cooked salmon served with vegetables',
        prepTime: '35 minutes',
        ingredients: ['Salmon', 'Brown rice', 'Edamame', 'Cucumber', 'Carrot', 'Soy-ginger sauce'],
        steps: [
            'Cook the brown rice according to the package directions.',
            'Bake the salmon at 400°F (200°C) until it flakes easily and reaches 145°F (63°C) inside, about 12–15 minutes.',
            'Cook the edamame according to its package directions. Thinly slice the cucumber and carrot.',
            'Serve the salmon over rice with the vegetables and edamame. Drizzle with soy-ginger sauce.'
        ]
    }
];

const weekdayBreakfasts: Meal[] = [
    {
        day: 'Monday',
        name: 'Berry yogurt breakfast bowl',
        imageId: '1490474418585-ba9bad8fd0ea',
        imageAlt: 'Yogurt breakfast bowl topped with berries',
        prepTime: '10 minutes',
        ingredients: ['Greek yogurt', 'Strawberries', 'Blueberries', 'Granola', 'Honey'],
        steps: [
            'Spoon the Greek yogurt into a bowl.',
            'Rinse the berries and slice the strawberries.',
            'Top the yogurt with berries and granola, then drizzle with honey.'
        ]
    },
    {
        day: 'Tuesday',
        name: 'Avocado and egg toast',
        imageId: '1525351484163-7529414344d8',
        imageAlt: 'Toast topped with avocado and egg',
        prepTime: '15 minutes',
        ingredients: ['Whole-grain bread', 'Eggs', 'Avocado', 'Lemon', 'Black pepper'],
        steps: [
            'Toast the bread until golden.',
            'Cook the eggs to your preference in a lightly oiled pan.',
            'Mash the avocado with a squeeze of lemon and spread it on the toast.',
            'Top with the eggs and a pinch of black pepper.'
        ]
    },
    {
        day: 'Wednesday',
        name: 'Overnight berry oats',
        imageId: '1497888329096-51c27beff665',
        imageAlt: 'Bowls of oatmeal with fruit',
        prepTime: '10 minutes plus chilling',
        ingredients: ['Rolled oats', 'Milk', 'Chia seeds', 'Mixed berries', 'Maple syrup'],
        steps: [
            'Stir the oats, milk, and chia seeds together in a covered container.',
            'Refrigerate overnight, or for at least 4 hours.',
            'Stir, add a splash of milk if needed, and top with berries and maple syrup.'
        ]
    },
    {
        day: 'Thursday',
        name: 'Spinach and feta omelet',
        imageId: '1494597706938-de2cd7341979',
        imageAlt: 'Omelet served on a plate',
        prepTime: '15 minutes',
        ingredients: ['Eggs', 'Spinach', 'Feta', 'Milk', 'Olive oil'],
        steps: [
            'Whisk the eggs with a splash of milk.',
            'Warm olive oil in a nonstick pan and cook the spinach until wilted.',
            'Pour in the eggs and cook over medium-low heat, gently lifting the edges as they set.',
            'Add crumbled feta, fold the omelet, and cook until the center is set.'
        ]
    },
    {
        day: 'Friday',
        name: 'Peanut butter banana smoothie bowl',
        imageId: '1494597564530-871f2b93ac55',
        imageAlt: 'Fruit smoothie bowl with toppings',
        prepTime: '10 minutes',
        ingredients: ['Banana', 'Greek yogurt', 'Peanut butter', 'Milk', 'Rolled oats'],
        steps: [
            'Add the banana, Greek yogurt, peanut butter, and a small splash of milk to a blender.',
            'Blend until thick and smooth, adding only enough milk to keep it moving.',
            'Pour into a bowl and top with rolled oats.'
        ]
    }
];

const weekdayDinners: Meal[] = [
    {
        day: 'Monday',
        name: 'Sheet-pan chicken and vegetables',
        imageId: '1764756995069-4a0b5f31d792',
        imageAlt: 'Roasted chicken drumsticks',
        prepTime: '35 minutes',
        ingredients: ['Chicken breast', 'Broccoli', 'Bell pepper', 'Red onion', 'Olive oil', 'Garlic'],
        steps: [
            'Heat the oven to 425°F (220°C) and line a sheet pan.',
            'Cut the chicken and vegetables into bite-size pieces, then toss with olive oil and garlic.',
            'Spread everything on the pan and roast for 20–25 minutes, turning once, until the vegetables are tender and the chicken reaches 165°F (74°C).'
        ]
    },
    {
        day: 'Tuesday',
        name: 'Turkey tacos',
        imageId: '1551504734-5ee1c4a1479b',
        imageAlt: 'Tacos ready to serve',
        prepTime: '25 minutes',
        ingredients: ['Ground turkey', 'Tortillas', 'Taco seasoning', 'Shredded lettuce', 'Cheddar', 'Salsa'],
        steps: [
            'Brown the ground turkey in a skillet, breaking it up as it cooks.',
            'Stir in taco seasoning and water as directed on the packet; cook until the turkey reaches 165°F (74°C).',
            'Warm the tortillas and fill with turkey, lettuce, cheddar, and salsa.'
        ]
    },
    {
        day: 'Wednesday',
        name: 'Turkey meatballs and marinara pasta',
        imageId: '1551183053-bf91a1d81141',
        imageAlt: 'Pasta with sauce and fresh herbs',
        prepTime: '35 minutes',
        ingredients: ['Ground turkey', 'Egg', 'Breadcrumbs', 'Pasta', 'Marinara sauce', 'Parmesan'],
        steps: [
            'Heat the oven to 400°F (200°C). Mix the turkey with the egg and breadcrumbs, then shape into small meatballs.',
            'Bake for 15–20 minutes, until the centers reach 165°F (74°C).',
            'Meanwhile, cook the pasta according to its package directions and warm the marinara sauce.',
            'Toss the pasta with sauce, add the meatballs, and finish with Parmesan.'
        ]
    },
    {
        day: 'Thursday',
        name: 'Tofu and vegetable stir-fry',
        imageId: '1512058564366-18510be2db19',
        imageAlt: 'Rice bowl with vegetables',
        prepTime: '30 minutes',
        ingredients: ['Firm tofu', 'Broccoli', 'Bell pepper', 'Snap peas', 'Rice', 'Soy-ginger sauce'],
        steps: [
            'Cook the rice according to the package directions.',
            'Drain and cube the tofu. Pat it dry, then brown it in a hot oiled skillet.',
            'Add the broccoli, bell pepper, and snap peas; stir-fry until crisp-tender.',
            'Pour in the soy-ginger sauce, toss to coat, and serve over rice.'
        ]
    },
    {
        day: 'Friday',
        name: 'Red lentil coconut curry',
        imageId: '1585937421612-70a008356fbe',
        imageAlt: 'A bowl of curry ready to serve',
        prepTime: '35 minutes',
        ingredients: ['Red lentils', 'Coconut milk', 'Curry paste', 'Vegetable broth', 'Spinach', 'Basmati rice'],
        steps: [
            'Cook the basmati rice according to the package directions.',
            'Rinse the lentils. In a saucepan, stir the curry paste with a little broth until fragrant.',
            'Add the lentils, remaining broth, and coconut milk. Simmer for 15–20 minutes, stirring occasionally, until the lentils are tender.',
            'Fold in the spinach until wilted and serve with rice.'
        ]
    }
];

// All meal types reuse the same card and cooking-details UI.
const weekdayMeals: Record<MealType, Meal[]> = {
    breakfast: weekdayBreakfasts,
    lunch: weekdayLunches,
    dinner: weekdayDinners
};

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];
const mealLabels: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner'
};
const mealCountLabels: Record<MealType, string> = {
    breakfast: 'breakfasts',
    lunch: 'lunches',
    dinner: 'dinners'
};

function MealPlanPage() {
    const [activeMealType, setActiveMealType] = useState<MealType>('lunch');
    // Showing one recipe at a time keeps the weekday grid compact.
    const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
    const meals = weekdayMeals[activeMealType];

    return (
        <section className="meal-plan" aria-labelledby="meal-plan-title">
            <header className="meal-plan-heading">
                <div>
                    <p className="eyebrow">MONDAY–FRIDAY · {mealLabels[activeMealType].toUpperCase()}</p>
                    <h1 id="meal-plan-title">Weekday meal plan</h1>
                    <p className="muted">Five {mealLabels[activeMealType].toLowerCase()} ideas, with ingredients and cooking details.</p>
                </div>
                <span className="meal-plan-count">{meals.length} {mealCountLabels[activeMealType]}</span>
            </header>
            <div className="meal-type-switcher" role="group" aria-label="Choose a meal">
                {mealTypes.map(mealType => (
                    <button
                        className={activeMealType === mealType ? 'active' : ''}
                        type="button"
                        aria-pressed={activeMealType === mealType}
                        key={mealType}
                        onClick={() => {
                            setActiveMealType(mealType);
                            setExpandedMeal(null);
                        }}
                    >{mealLabels[mealType]}</button>
                ))}
            </div>
            <div className="meal-grid">
                {meals.map((meal, index) => (
                    <article className="meal-card" key={meal.day}>
                        <img
                            className="meal-image"
                            src={`https://images.unsplash.com/photo-${meal.imageId}?auto=format&fit=crop&w=960&q=80`}
                            alt={meal.imageAlt}
                            loading="lazy"
                            decoding="async"
                        />
                        <div className="meal-day-heading">
                            <span className="meal-day-number">{String(index + 1).padStart(2, '0')}</span>
                            <p>{meal.day}</p>
                        </div>
                        <h2>
                            <button
                                className="meal-name-button"
                                type="button"
                                aria-expanded={expandedMeal === meal.day}
                                aria-controls={`cooking-details-${activeMealType}-${meal.day.toLowerCase()}`}
                                onClick={() => setExpandedMeal(expandedMeal === meal.day ? null : meal.day)}
                            >
                                <span>{meal.name}</span>
                                <span className="meal-recipe-hint">
                                    {expandedMeal === meal.day ? 'Hide cooking details' : 'View cooking details'}
                                    <span aria-hidden="true">{expandedMeal === meal.day ? '−' : '+'}</span>
                                </span>
                            </button>
                        </h2>
                        <div className="meal-ingredients">
                            <h3>Ingredients</h3>
                            <ul>
                                {meal.ingredients
                                    .toSorted((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                                    .map(ingredient => <li key={ingredient}>{ingredient}</li>)}
                            </ul>
                        </div>
                        <section
                            className="meal-cooking-details"
                            id={`cooking-details-${activeMealType}-${meal.day.toLowerCase()}`}
                            aria-label={`${meal.name} cooking details`}
                            hidden={expandedMeal !== meal.day}
                        >
                            <p className="meal-prep-time">{meal.prepTime} <span>·</span> Serves 1</p>
                            <h3>Cooking steps</h3>
                            <ol>
                                {meal.steps.map(step => <li key={step}>{step}</li>)}
                            </ol>
                        </section>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default MealPlanPage;
