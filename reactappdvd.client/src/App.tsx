import { useEffect, useState, type FormEvent } from 'react';
import './App.css';

interface Forecast {
    date: string;
    temperatureC: number;
    temperatureF: number;
    summary: string;
}

type TemperatureUnit = 'C' | 'F';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [forecasts, setForecasts] = useState<Forecast[]>();
    const [username, setUsername] = useState('demo');
    const [password, setPassword] = useState('password');
    const [loginError, setLoginError] = useState('');
    const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('C');

    useEffect(() => {
        if (isLoggedIn) {
            populateWeatherData();
        }
    }, [isLoggedIn]);

    async function login(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoginError('');

        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            setIsLoggedIn(true);
        } else {
            setLoginError('Invalid username or password.');
        }
    }

    async function logout() {
        await fetch('/logout', { method: 'POST' });
        setIsLoggedIn(false);
        setForecasts(undefined);
    }

    if (!isLoggedIn) {
        return (
            <main className="auth-shell">
                <section className="auth-card" aria-labelledby="login-title">
                    <div className="brand-mark" aria-hidden="true">☀</div>
                    <p className="eyebrow">WEATHERSPACE</p>
                    <h1 id="login-title">Welcome back</h1>
                    <p className="muted">Sign in to see your local forecast.</p>
                    <form className="login-form" onSubmit={login}>
                        <div className="field">
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                value={username}
                                onChange={event => setUsername(event.target.value)}
                                autoComplete="username"
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        {loginError && <p className="error-message" role="alert">{loginError}</p>}
                        <button className="primary-button" type="submit">Sign in <span aria-hidden="true">→</span></button>
                    </form>
                    <p className="demo-hint">Demo access: <strong>demo</strong> / <strong>password</strong></p>
                </section>
            </main>
        );
    }

    const contents = forecasts === undefined
        ? <div className="loading-card"><span className="spinner" aria-hidden="true" />Loading your forecast...</div>
        : <div className="table-card">
            <div className="table-heading">
                <div>
                    <p className="eyebrow">NEXT FIVE DAYS</p>
                    <h2>Detailed forecast</h2>
                </div>
                <div className="table-actions">
                    <div className="unit-toggle" role="group" aria-label="Temperature unit">
                        <button
                            className={temperatureUnit === 'C' ? 'selected' : ''}
                            type="button"
                            onClick={() => setTemperatureUnit('C')}
                            aria-pressed={temperatureUnit === 'C'}
                        >°C</button>
                        <button
                            className={temperatureUnit === 'F' ? 'selected' : ''}
                            type="button"
                            onClick={() => setTemperatureUnit('F')}
                            aria-pressed={temperatureUnit === 'F'}
                        >°F</button>
                    </div>
                    <span className="live-badge"><span /> Live</span>
                </div>
            </div>
            <div className="table-scroll">
                <table aria-labelledby="tableLabel">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Conditions</th>
                            <th>Temperature</th>
                            <th>Converted temperature</th>
                        </tr>
                    </thead>
                    <tbody>
                        {forecasts.map(forecast =>
                            <tr key={forecast.date}>
                                <td><strong>{formatDate(forecast.date)}</strong></td>
                                <td><span className="condition-icon" aria-hidden="true">☀</span>{forecast.summary}</td>
                                <td><strong>{temperatureUnit === 'C' ? forecast.temperatureC : forecast.temperatureF}°{temperatureUnit}</strong></td>
                                <td>{temperatureUnit === 'C' ? forecast.temperatureF : forecast.temperatureC}°{temperatureUnit === 'C' ? 'F' : 'C'}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>;

    return (
        <main className="dashboard-shell">
            <header className="topbar">
                <div className="brand"><span className="brand-mark small" aria-hidden="true">☀</span><span>WEATHERSPACE</span></div>
                <button className="sign-out-button" type="button" onClick={logout}>Sign out <span aria-hidden="true">↗</span></button>
            </header>
            <section className="hero" aria-labelledby="tableLabel">
                <div>
                    <p className="eyebrow">YOUR PERSONAL FORECAST</p>
                    <h1 id="tableLabel">Good morning, {username}.</h1>
                    <p className="muted">Here&apos;s what the sky has in store for the next few days.</p>
                </div>
                <div className="hero-icon" aria-hidden="true">☀</div>
            </section>
            {forecasts && <section className="stats-grid" aria-label="Current weather summary">
                <div className="stat-card accent-card"><span className="stat-icon">☀</span><div><span className="stat-label">Today&apos;s outlook</span><strong>{forecasts[0]?.summary}</strong></div></div>
                <div className="stat-card"><span className="stat-icon">🌡</span><div><span className="stat-label">Temperature</span><strong>{temperatureUnit === 'C' ? forecasts[0]?.temperatureC : forecasts[0]?.temperatureF}°{temperatureUnit} <small>/ {temperatureUnit === 'C' ? forecasts[0]?.temperatureF : forecasts[0]?.temperatureC}°{temperatureUnit === 'C' ? 'F' : 'C'}</small></strong></div></div>
                <div className="stat-card"><span className="stat-icon">◷</span><div><span className="stat-label">Forecast period</span><strong>{forecasts.length} days</strong></div></div>
            </section>}
            {contents}
        </main>
    );

    function formatDate(date: string) {
        return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    async function populateWeatherData() {
        const response = await fetch('weatherforecast');
        if (response.ok) {
            const data = await response.json();
            setForecasts(data);
        }
    }
}

export default App;