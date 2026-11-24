import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MealPlanPage from './MealPlanPage';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body
    } as Response;
}

describe('MealPlanPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('shows an empty state for a new user without seeding sample meals', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse([]));

        render(<MealPlanPage />);

        expect(await screen.findByText('No lunch plan yet')).toBeTruthy();
        expect(screen.queryByText(/Mediterranean chickpea bowl/)).toBeNull();
        expect(screen.getByRole('button', { name: 'Create lunch plan' })).toBeTruthy();
    });

    it('does not duplicate the photo prefix for a stored Unsplash image ID', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse([{
            id: 7,
            category: 'lunch',
            meals: [{
                id: 12,
                day: 'monday',
                name: 'Garden salad',
                imageId: 'photo-123',
                imageAlt: 'A garden salad',
                prepTime: '10 minutes',
                ingredients: ['Lettuce'],
                steps: ['Toss.']
            }]
        }]));

        render(<MealPlanPage />);

        const image = await screen.findByRole('img', { name: 'A garden salad' });
        expect(image.getAttribute('src')).toBe('https://images.unsplash.com/photo-123?auto=format&fit=crop&w=960&q=80');
    });

    it('builds the Unsplash URL for a raw image ID', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse([{
            id: 7,
            category: 'lunch',
            meals: [{
                id: 12,
                day: 'monday',
                name: 'Garden salad',
                imageId: 'raw-abc',
                imageAlt: 'A garden salad',
                prepTime: '10 minutes',
                ingredients: ['Lettuce'],
                steps: ['Toss.']
            }]
        }]));

        render(<MealPlanPage />);

        const image = await screen.findByRole('img', { name: 'A garden salad' });
        expect(image.getAttribute('src')).toBe('https://images.unsplash.com/photo-raw-abc?auto=format&fit=crop&w=960&q=80');
    });

    it('shows a graceful fallback when a meal image fails to load', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse([{
            id: 7,
            category: 'lunch',
            meals: [{
                id: 12,
                day: 'monday',
                name: 'Garden salad',
                imageId: 'unavailable-image',
                imageAlt: 'A garden salad',
                prepTime: '10 minutes',
                ingredients: ['Lettuce'],
                steps: ['Toss.']
            }]
        }]));

        render(<MealPlanPage />);

        fireEvent.error(await screen.findByRole('img', { name: 'A garden salad' }));

        expect(screen.getByRole('img', { name: 'A garden salad (image unavailable)' })).toBeTruthy();
        expect(screen.getByText('Image unavailable')).toBeTruthy();
    });

    it('creates an empty category plan and saves all editable meal fields', async () => {
        const user = userEvent.setup();
        const emptyPlan = { id: 7, category: 'lunch', meals: [] };
        const savedMeal = {
            id: 12,
            day: 'tuesday',
            name: 'Garden wrap',
            imageId: 'image-123',
            imageAlt: 'A green wrap cut in half',
            prepTime: '15 minutes',
            ingredients: ['Tortilla', 'Spinach'],
            steps: ['Fill the tortilla.', 'Roll and serve.']
        };
        fetchMock
            .mockResolvedValueOnce(jsonResponse([]))
            .mockResolvedValueOnce(jsonResponse(emptyPlan, 201))
            .mockResolvedValueOnce(jsonResponse({ ...emptyPlan, meals: [savedMeal] }));

        render(<MealPlanPage />);
        await user.click(await screen.findByRole('button', { name: 'Create lunch plan' }));
        await user.click(await screen.findByRole('button', { name: 'Add a meal' }));
        await user.selectOptions(screen.getByLabelText('Day'), 'tuesday');
        await user.type(screen.getByLabelText('Meal name'), 'Garden wrap');
        await user.type(screen.getByLabelText(/Image ID/), 'image-123');
        await user.type(screen.getByLabelText('Image description'), 'A green wrap cut in half');
        await user.type(screen.getByLabelText('Prep time'), '15 minutes');
        await user.type(screen.getByLabelText(/Ingredients/), 'Tortilla\nSpinach');
        await user.type(screen.getByLabelText(/Cooking steps/), 'Fill the tortilla.\nRoll and serve.');
        await user.click(screen.getByRole('button', { name: 'Save meal' }));

        expect(await screen.findByText('Garden wrap')).toBeTruthy();
        const putCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT');
        expect(putCall).toBeTruthy();
        const payload = JSON.parse(String(putCall?.[1]?.body)) as {
            meals: Array<Omit<typeof savedMeal, 'id'>>;
        };
        expect(payload.meals).toEqual([{
            day: 'tuesday',
            name: 'Garden wrap',
            imageId: 'image-123',
            imageAlt: 'A green wrap cut in half',
            prepTime: '15 minutes',
            ingredients: ['Tortilla', 'Spinach'],
            steps: ['Fill the tortilla.', 'Roll and serve.']
        }]);
    });

    it('edits and removes a meal, clearing expanded state after removal', async () => {
        const user = userEvent.setup();
        const meal = {
            id: 12,
            day: 'monday',
            name: 'Original oats',
            imageId: 'image-123',
            imageAlt: 'A bowl of oats',
            prepTime: '10 minutes',
            ingredients: ['Oats'],
            steps: ['Mix.']
        };
        const lunchPlan = { id: 7, category: 'lunch', meals: [meal] };
        fetchMock
            .mockResolvedValueOnce(jsonResponse([lunchPlan]))
            .mockResolvedValueOnce(jsonResponse({ ...lunchPlan, meals: [{ ...meal, name: 'Berry oats' }] }))
            .mockResolvedValueOnce(jsonResponse({ ...lunchPlan, meals: [] }));

        render(<MealPlanPage />);
        await user.click(await screen.findByRole('button', { name: /Original oats/ }));
        expect(screen.getByText('Mix.', { exact: true })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Edit meal' }));
        const name = screen.getByLabelText('Meal name');
        await user.clear(name);
        await user.type(name, 'Berry oats');
        await user.click(screen.getByRole('button', { name: 'Save meal' }));

        expect(await screen.findByText('Berry oats')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Remove meal' }));
        expect(await screen.findByText('Your plan is empty. Add a meal for any weekday to get started.')).toBeTruthy();
    });

    it('deletes a plan and resets editing state', async () => {
        const user = userEvent.setup();
        vi.stubGlobal('confirm', vi.fn(() => true));
        const lunchPlan = {
            id: 7,
            category: 'lunch',
            meals: [{
                id: 12,
                day: 'monday',
                name: 'Soup',
                imageId: 'image-123',
                imageAlt: 'A bowl of soup',
                prepTime: '20 minutes',
                ingredients: ['Beans'],
                steps: ['Simmer.']
            }]
        };
        fetchMock
            .mockResolvedValueOnce(jsonResponse([lunchPlan]))
            .mockResolvedValueOnce(jsonResponse({}, 204));

        render(<MealPlanPage />);
        await user.click(await screen.findByRole('button', { name: 'Edit meal' }));
        await user.click(screen.getByRole('button', { name: 'Delete lunch plan' }));

        expect(await screen.findByText('No lunch plan yet')).toBeTruthy();
        expect(screen.queryByText('Edit meal')).toBeNull();
    });

    it('shows loading and load error states', async () => {
        fetchMock.mockReturnValueOnce(new Promise<Response>(() => undefined));
        const first = render(<MealPlanPage />);
        expect(screen.getByRole('status').textContent).toContain('Loading');
        first.unmount();

        fetchMock.mockResolvedValueOnce(jsonResponse({ title: 'Could not load plans' }, 500));
        render(<MealPlanPage />);
        expect(await screen.findByRole('alert')).toBeTruthy();
    });

    it('clears expanded and edit state when switching categories', async () => {
        const user = userEvent.setup();
        const lunchPlan = {
            id: 7,
            category: 'lunch',
            meals: [{
                id: 12,
                day: 'monday',
                name: 'Lunch bowl',
                imageId: 'image-123',
                imageAlt: 'A lunch bowl',
                prepTime: '10 minutes',
                ingredients: ['Rice'],
                steps: ['Serve.']
            }]
        };
        fetchMock.mockResolvedValueOnce(jsonResponse([lunchPlan]));

        render(<MealPlanPage />);
        await user.click(await screen.findByRole('button', { name: /Lunch bowl/ }));
        expect(screen.getByText('Serve.', { exact: true })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Dinner' }));

        expect(await screen.findByText('No dinner plan yet')).toBeTruthy();
        expect(screen.queryByText('Serve.', { exact: true })).toBeNull();
        expect(screen.queryByRole('heading', { name: 'Edit meal' })).toBeNull();
    });
});
