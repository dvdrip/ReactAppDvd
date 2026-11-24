import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './MealPlanPage.css';

type MealCategory = 'breakfast' | 'lunch' | 'dinner';
type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

interface Meal {
    id: number;
    day: Weekday;
    name: string;
    imageId: string;
    imageAlt: string;
    prepTime: string;
    ingredients: string[];
    steps: string[];
}

interface MealPlan {
    id: number;
    category: MealCategory;
    meals: Meal[];
}

interface MealDraft {
    day: Weekday;
    name: string;
    imageId: string;
    imageAlt: string;
    prepTime: string;
    ingredients: string;
    steps: string;
}

const categories: MealCategory[] = ['breakfast', 'lunch', 'dinner'];
const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const labels: Record<MealCategory, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner'
};
const emptyDraft = (day: Weekday): MealDraft => ({
    day,
    name: '',
    imageId: '',
    imageAlt: '',
    prepTime: '',
    ingredients: '',
    steps: ''
});

function MealPlanPage() {
    const [plans, setPlans] = useState<MealPlan[]>([]);
    const [activeCategory, setActiveCategory] = useState<MealCategory>('lunch');
    const [expandedMeal, setExpandedMeal] = useState<Weekday | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [editingDay, setEditingDay] = useState<Weekday | null>(null);
    const [draft, setDraft] = useState<MealDraft | null>(null);

    useEffect(() => {
        let isCurrent = true;
        fetch('/api/meal-plans', { credentials: 'same-origin' })
            .then(async response => {
                if (!response.ok) throw new Error(await responseMessage(response));
                return await response.json() as MealPlan[];
            })
            .then(data => {
                if (isCurrent) setPlans(data);
            })
            .catch((cause: unknown) => {
                if (isCurrent) setError(cause instanceof Error ? cause.message : 'Meal plans could not be loaded.');
            })
            .finally(() => {
                if (isCurrent) setIsLoading(false);
            });
        return () => { isCurrent = false; };
    }, []);

    const activePlan = plans.find(plan => plan.category === activeCategory);
    const availableDays = useMemo(
        () => weekdays.filter(day => !activePlan?.meals.some(meal => meal.day === day) || editingDay === day),
        [activePlan, editingDay]
    );

    async function createPlan() {
        setError('');
        setIsSaving(true);
        try {
            const response = await fetch('/api/meal-plans', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: activeCategory })
            });
            if (!response.ok) throw new Error(await responseMessage(response));
            const plan = await response.json() as MealPlan;
            setPlans(current => [...current.filter(existing => existing.category !== plan.category), plan]);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The meal plan could not be created.');
        } finally {
            setIsSaving(false);
        }
    }

    async function deletePlan() {
        if (!activePlan || !window.confirm(`Delete your ${labels[activeCategory].toLowerCase()} plan and all its meals?`)) return;
        setError('');
        setIsSaving(true);
        try {
            const response = await fetch(`/api/meal-plans/${activeCategory}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            if (!response.ok) throw new Error(await responseMessage(response));
            setPlans(current => current.filter(plan => plan.category !== activeCategory));
            setExpandedMeal(null);
            setEditingDay(null);
            setDraft(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The meal plan could not be deleted.');
        } finally {
            setIsSaving(false);
        }
    }

    function startAddingMeal() {
        const firstAvailableDay = weekdays.find(day => !activePlan?.meals.some(meal => meal.day === day));
        if (!firstAvailableDay) return;
        setError('');
        setEditingDay(null);
        setDraft(emptyDraft(firstAvailableDay));
    }

    function startEditingMeal(meal: Meal) {
        setError('');
        setEditingDay(meal.day);
        setDraft({
            day: meal.day,
            name: meal.name,
            imageId: meal.imageId,
            imageAlt: meal.imageAlt,
            prepTime: meal.prepTime,
            ingredients: meal.ingredients.join('\n'),
            steps: meal.steps.join('\n')
        });
    }

    async function saveMeal(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!activePlan || !draft) return;

        const ingredients = draft.ingredients.split('\n').map(value => value.trim()).filter(Boolean);
        const steps = draft.steps.split('\n').map(value => value.trim()).filter(Boolean);
        if (ingredients.length === 0 || steps.length === 0) {
            setError('Add at least one ingredient and one cooking step.');
            return;
        }

        const meal: Omit<Meal, 'id'> = {
            day: draft.day,
            name: draft.name.trim(),
            imageId: draft.imageId.trim(),
            imageAlt: draft.imageAlt.trim(),
            prepTime: draft.prepTime.trim(),
            ingredients,
            steps
        };
        const meals = activePlan.meals
            .filter(existing => existing.day !== editingDay)
            .map(toMealRequest);
        meals.push(meal);

        setError('');
        setIsSaving(true);
        try {
            const response = await fetch(`/api/meal-plans/${activeCategory}`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meals })
            });
            if (!response.ok) throw new Error(await responseMessage(response));
            const updatedPlan = await response.json() as MealPlan;
            setPlans(current => current.map(plan => plan.category === updatedPlan.category ? updatedPlan : plan));
            setDraft(null);
            setEditingDay(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The meal could not be saved.');
        } finally {
            setIsSaving(false);
        }
    }

    async function removeMeal(day: Weekday) {
        if (!activePlan) return;
        const meals = activePlan.meals
            .filter(meal => meal.day !== day)
            .map(toMealRequest);
        setError('');
        setIsSaving(true);
        try {
            const response = await fetch(`/api/meal-plans/${activeCategory}`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meals })
            });
            if (!response.ok) throw new Error(await responseMessage(response));
            const updatedPlan = await response.json() as MealPlan;
            setPlans(current => current.map(plan => plan.category === updatedPlan.category ? updatedPlan : plan));
            if (expandedMeal === day) setExpandedMeal(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The meal could not be removed.');
        } finally {
            setIsSaving(false);
        }
    }

    function changeCategory(category: MealCategory) {
        setActiveCategory(category);
        setExpandedMeal(null);
        setEditingDay(null);
        setDraft(null);
        setError('');
    }

    return (
        <section className="meal-plan" aria-labelledby="meal-plan-title">
            <header className="meal-plan-heading">
                <div>
                    <p className="eyebrow">MONDAY–FRIDAY · {labels[activeCategory].toUpperCase()}</p>
                    <h1 id="meal-plan-title">Weekday meal plan</h1>
                    <p className="muted">Build your own weekday meals, with ingredients and cooking details.</p>
                </div>
                <span className="meal-plan-count">{activePlan?.meals.length ?? 0} / 5 meals</span>
            </header>

            <div className="meal-type-switcher" role="group" aria-label="Choose a meal category">
                {categories.map(category => (
                    <button
                        className={activeCategory === category ? 'active' : ''}
                        type="button"
                        aria-pressed={activeCategory === category}
                        key={category}
                        onClick={() => changeCategory(category)}
                    >{labels[category]}</button>
                ))}
            </div>

            {error && <p className="meal-plan-error" role="alert">{error}</p>}
            {isLoading ? (
                <p className="meal-plan-message" role="status">Loading your meal plans…</p>
            ) : !activePlan ? (
                <div className="meal-plan-empty">
                    <h2>No {labels[activeCategory].toLowerCase()} plan yet</h2>
                    <p>Create a plan to start adding your weekday meals.</p>
                    <button className="meal-action-button primary" type="button" disabled={isSaving} onClick={createPlan}>
                        Create {labels[activeCategory].toLowerCase()} plan
                    </button>
                </div>
            ) : (
                <>
                    <div className="meal-plan-actions">
                        <button
                            className="meal-action-button primary"
                            type="button"
                            disabled={isSaving || editingDay !== null || availableDays.length === 0}
                            onClick={startAddingMeal}
                        >Add a meal</button>
                        <button className="meal-action-button danger" type="button" disabled={isSaving} onClick={deletePlan}>
                            Delete {labels[activeCategory].toLowerCase()} plan
                        </button>
                    </div>

                    {draft && (
                        <form className="meal-editor" onSubmit={saveMeal} aria-labelledby="meal-editor-title">
                            <h2 id="meal-editor-title">{editingDay ? 'Edit meal' : 'Add a meal'}</h2>
                            <div className="meal-editor-grid">
                                <label>
                                    Day
                                    <select
                                        value={draft.day}
                                        onChange={event => setDraft({ ...draft, day: event.target.value as Weekday })}
                                    >
                                        {availableDays.map(day => <option value={day} key={day}>{titleCase(day)}</option>)}
                                    </select>
                                </label>
                                <label>
                                    Meal name
                                    <input required maxLength={100} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
                                </label>
                                <label>
                                    Image ID <span>Unsplash photo ID from its image URL; include or omit the leading “photo-”.</span>
                                    <input required maxLength={100} value={draft.imageId} onChange={event => setDraft({ ...draft, imageId: event.target.value })} />
                                </label>
                                <label>
                                    Image description
                                    <input required maxLength={200} value={draft.imageAlt} onChange={event => setDraft({ ...draft, imageAlt: event.target.value })} />
                                </label>
                                <label>
                                    Prep time
                                    <input required maxLength={100} value={draft.prepTime} onChange={event => setDraft({ ...draft, prepTime: event.target.value })} />
                                </label>
                                <label>
                                    Ingredients <span>(one per line)</span>
                                    <textarea required rows={4} value={draft.ingredients} onChange={event => setDraft({ ...draft, ingredients: event.target.value })} />
                                </label>
                                <label className="meal-editor-steps">
                                    Cooking steps <span>(one per line)</span>
                                    <textarea required rows={4} value={draft.steps} onChange={event => setDraft({ ...draft, steps: event.target.value })} />
                                </label>
                            </div>
                            <div className="meal-editor-actions">
                                <button className="meal-action-button primary" type="submit" disabled={isSaving}>
                                    {isSaving ? 'Saving…' : 'Save meal'}
                                </button>
                                <button className="meal-action-button" type="button" disabled={isSaving} onClick={() => { setDraft(null); setEditingDay(null); }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {activePlan.meals.length === 0 ? (
                        <p className="meal-plan-message">Your plan is empty. Add a meal for any weekday to get started.</p>
                    ) : (
                        <div className="meal-grid">
                            {activePlan.meals.map(meal => (
                                <article className="meal-card" key={meal.day}>
                                    <MealImage key={meal.imageId} imageId={meal.imageId} imageAlt={meal.imageAlt} />
                                    <div className="meal-day-heading">
                                        <span className="meal-day-number">{String(weekdays.indexOf(meal.day) + 1).padStart(2, '0')}</span>
                                        <p>{titleCase(meal.day)}</p>
                                    </div>
                                    <h2>
                                        <button
                                            className="meal-name-button"
                                            type="button"
                                            aria-expanded={expandedMeal === meal.day}
                                            aria-controls={`cooking-details-${activeCategory}-${meal.day}`}
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
                                        <ul>{meal.ingredients.map((ingredient, index) => <li key={`${index}-${ingredient}`}>{ingredient}</li>)}</ul>
                                    </div>
                                    <section
                                        className="meal-cooking-details"
                                        id={`cooking-details-${activeCategory}-${meal.day}`}
                                        aria-label={`${meal.name} cooking details`}
                                        hidden={expandedMeal !== meal.day}
                                    >
                                        <p className="meal-prep-time">{meal.prepTime} <span>·</span> Serves 1</p>
                                        <h3>Cooking steps</h3>
                                        <ol>{meal.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
                                    </section>
                                    <div className="meal-card-actions">
                                        <button type="button" disabled={isSaving || draft !== null} onClick={() => startEditingMeal(meal)}>Edit meal</button>
                                        <button type="button" disabled={isSaving || draft !== null} onClick={() => void removeMeal(meal.day)}>Remove meal</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function MealImage({ imageId, imageAlt }: Pick<Meal, 'imageId' | 'imageAlt'>) {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div className="meal-image meal-image-unavailable" role="img" aria-label={`${imageAlt} (image unavailable)`}>
                Image unavailable
            </div>
        );
    }

    const photoId = imageId.trim().replace(/^photo-/, '');
    return (
        <img
            className="meal-image"
            src={`https://images.unsplash.com/photo-${encodeURIComponent(photoId)}?auto=format&fit=crop&w=960&q=80`}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            onError={() => setHasError(true)}
        />
    );
}

async function responseMessage(response: Response): Promise<string> {
    try {
        const problem = await response.json() as { title?: string; detail?: string; errors?: Record<string, string[]> };
        return Object.values(problem.errors ?? {}).flat()[0] ?? problem.detail ?? problem.title ?? 'The request could not be completed.';
    } catch {
        return response.status === 401 ? 'Please sign in again to manage your meal plans.' : 'The request could not be completed.';
    }
}

function titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function toMealRequest(meal: Meal): Omit<Meal, 'id'> {
    return {
        day: meal.day,
        name: meal.name,
        imageId: meal.imageId,
        imageAlt: meal.imageAlt,
        prepTime: meal.prepTime,
        ingredients: meal.ingredients,
        steps: meal.steps
    };
}

export default MealPlanPage;
