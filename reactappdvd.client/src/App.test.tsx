import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body
    } as Response;
}

describe('registration errors', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('does not display detailed account-creation errors from the API', async () => {
        const user = userEvent.setup();
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ isAuthenticated: false }))
            .mockResolvedValueOnce(jsonResponse({
                errors: {
                    DuplicateUserName: ['The username is already taken.'],
                    DuplicateEmail: ['The email is already in use.']
                }
            }, 400));

        render(<App />);
        await user.click(screen.getByRole('button', { name: 'Create a new account' }));
        await user.type(screen.getByLabelText('Email'), 'existing@example.test');
        await user.type(screen.getByLabelText('Username'), 'existing-user');
        await user.type(screen.getByLabelText('Password'), 'Example123!');
        await user.click(screen.getByRole('button', { name: 'Create account' }));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe(
            'Account could not be created. Please check your information and try again.'
        );
        expect(alert.textContent).not.toMatch(/already taken|already in use/i);
    });
});
