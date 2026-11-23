import { useCallback, useEffect, useState, type FormEvent } from 'react';
import './App.css';
import MealPlanPage from './components/MealPlanPage';

interface Forecast {
    date: string;
    temperatureC: number;
    temperatureF: number;
    lowC: number;
    highC: number;
    summary: string;
    weatherCode: number;
}

interface OpenMeteoResponse {
    current: {
        temperature_2m: number;
        weather_code: number;
    };
    daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
    };
}

interface GeocodingResult {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    admin1?: string;
}

interface ReverseGeocodeResponse {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    countryName?: string;
}

type TemperatureUnit = 'C' | 'F';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activePage, setActivePage] = useState<'weather' | 'meal-plan'>('weather');
    const [forecasts, setForecasts] = useState<Forecast[]>();
    const [currentTemperatureC, setCurrentTemperatureC] = useState<number>();
    const [locationName, setLocationName] = useState('Your location');
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [weatherError, setWeatherError] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('F');

    useEffect(() => {
        fetch('/auth/status')
            .then(response => response.ok ? response.json() : Promise.reject())
            .then((status: { isAuthenticated: boolean }) => setIsLoggedIn(status.isAuthenticated))
            .catch(() => setIsLoggedIn(false));
    }, []);

    const loadWeather = useCallback(async (latitude: number, longitude: number, label: string) => {
        try {
            const params = new URLSearchParams({
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                current: 'temperature_2m,weather_code',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min',
                forecast_days: '5',
                timezone: 'auto'
            });
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
            if (!response.ok) throw new Error('Weather request failed');
            const data = await response.json() as OpenMeteoResponse;
            setForecasts(data.daily.time.map((date, index) => ({
                date,
                temperatureC: Math.round(data.daily.temperature_2m_max[index]),
                temperatureF: toFahrenheit(data.daily.temperature_2m_max[index]),
                lowC: Math.round(data.daily.temperature_2m_min[index]),
                highC: Math.round(data.daily.temperature_2m_max[index]),
                summary: weatherSummary(data.daily.weather_code[index]),
                weatherCode: data.daily.weather_code[index]
            })));
            setCurrentTemperatureC(Math.round(data.current.temperature_2m));
            setLocationName(label);
            setWeatherError('');
        } catch {
            setWeatherError('Live weather is temporarily unavailable. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const requestCurrentLocation = useCallback(() => {
        setWeatherError('');
        if (!navigator.geolocation) {
            setWeatherError('Location is not available in this browser. Search for a city instead.');
            return;
        }

        setIsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async position => {
                const { latitude, longitude } = position.coords;
                const label = await getLocationLabel(latitude, longitude);
                await loadWeather(latitude, longitude, label);
            },
            () => {
                setIsLoading(false);
                setWeatherError('Location permission was not granted. Search for a city below.');
            },
            { enableHighAccuracy: false, timeout: 10000 }
        );
    }, [loadWeather]);

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
            requestCurrentLocation();
        } else {
            setLoginError('Invalid username or password.');
        }
    }

    async function register(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoginError('');

        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });

        if (response.ok) {
            setIsLoggedIn(true);
            requestCurrentLocation();
        } else {
            try {
                const problem = await response.json() as {
                    detail?: string;
                    errors?: Record<string, string[]>;
                };
                const validationMessages = problem.errors
                    ? Object.values(problem.errors).flat()
                    : [];
                setLoginError(
                    validationMessages[0]
                    ?? problem.detail
                    ?? 'Account could not be created.'
                );
            } catch {
                setLoginError('Account could not be created.');
            }
        }
    }

    async function logout() {
        await fetch('/logout', { method: 'POST' });
        setIsLoggedIn(false);
        setForecasts(undefined);
    }

    async function searchCity(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!locationQuery.trim()) return;

        setIsLoading(true);
        setWeatherError('');
        try {
            const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery.trim())}&count=1&language=en&format=json`);
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json() as { results?: GeocodingResult[] };
            const result = data.results?.[0];
            if (!result) throw new Error('City not found');

            const label = result.admin1 ? `${result.name}, ${result.admin1}` : `${result.name}, ${result.country}`;
            await loadWeather(result.latitude, result.longitude, label);
        } catch {
            setIsLoading(false);
            setWeatherError('We could not find that city. Try a different search.');
        }
    }

    if (!isLoggedIn) {
        return (
            <main className="auth-shell">
                <section className="auth-card" aria-labelledby="login-title">
                    <div className="brand-mark" aria-hidden="true">☀</div>
                    <p className="eyebrow">DAILYPLATE</p>
                    <h1 id="login-title">{authMode === 'login' ? 'Welcome back' : 'Create account'}</h1>
                    <p className="muted">{authMode === 'login' ? 'Sign in to see your local forecast.' : 'Register to create a server-backed account.'}</p>
                    <form className="login-form" onSubmit={authMode === 'login' ? login : register}>
                        {authMode === 'register' && <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></div>}
                        <div className="field"><label htmlFor="username">Username</label><input id="username" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" /></div>
                        <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></div>
                        {loginError && <p className="error-message" role="alert">{loginError}</p>}
                        <button className="primary-button" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'} <span aria-hidden="true">→</span></button>
                    </form>
                    <button
                        className="auth-mode-toggle"
                        type="button"
                        onClick={() => {
                            setLoginError('');
                            setAuthMode(authMode === 'login' ? 'register' : 'login');
                        }}
                    >
                        {authMode === 'login' ? 'Create a new account' : 'Already have an account? Sign in'}
                    </button>
                </section>
            </main>
        );
    }

    const currentC = currentTemperatureC ?? forecasts?.[0]?.temperatureC ?? 0;
    const currentF = toFahrenheit(currentC);
    const displayedCurrent = temperatureUnit === 'C' ? currentC : currentF;
    const otherCurrent = temperatureUnit === 'C' ? currentF : currentC;
    const otherUnit = temperatureUnit === 'C' ? 'F' : 'C';

    return (
        <main className="dashboard-shell">
            <header className="topbar">
                <div className="brand"><span className="brand-mark small" aria-hidden="true">☀</span><span>DAILYPLATE</span></div>
                <nav className="page-navigation" aria-label="Main navigation">
                    <button
                        className={activePage === 'weather' ? 'active' : ''}
                        type="button"
                        aria-current={activePage === 'weather' ? 'page' : undefined}
                        onClick={() => setActivePage('weather')}
                    >Weather</button>
                    <button
                        className={activePage === 'meal-plan' ? 'active' : ''}
                        type="button"
                        aria-current={activePage === 'meal-plan' ? 'page' : undefined}
                        onClick={() => setActivePage('meal-plan')}
                    >Meal plan</button>
                </nav>
                <button className="sign-out-button" type="button" onClick={logout}>Sign out <span aria-hidden="true">↗</span></button>
            </header>
            {activePage === 'meal-plan' ? <MealPlanPage /> : <>
            <section className="hero" aria-labelledby="tableLabel">
                <div>
                    <p className="eyebrow">LIVE WEATHER · {locationName.toUpperCase()}</p>
                    <h1 id="tableLabel">Good morning, {username}.</h1>
                    <p className="muted">Your local forecast, updated in real time.</p>
                </div>
                <div className="hero-icon" aria-hidden="true">☀</div>
            </section>
            <section className="location-panel" aria-label="Weather location">
                <button className="location-button" type="button" onClick={requestCurrentLocation}>⌖ Use my location</button>
                <span className="location-divider">or</span>
                <form className="location-search" onSubmit={searchCity}>
                    <label className="sr-only" htmlFor="location-query">Search for a city</label>
                    <input id="location-query" placeholder="Search for a city" value={locationQuery} onChange={event => setLocationQuery(event.target.value)} />
                    <button type="submit" disabled={isLoading}>Search</button>
                </form>
            </section>
            {weatherError && <p className="weather-error" role="alert">{weatherError}</p>}
            {isLoading && <div className="loading-card"><span className="spinner" aria-hidden="true" />Loading live weather...</div>}
            {!isLoading && forecasts && <>
                <section className="stats-grid" aria-label="Current weather summary">
                    <div className="stat-card accent-card"><span className="stat-icon">☀</span><div><span className="stat-label">Current outlook</span><strong>{weatherSummary(forecasts[0].weatherCode)}</strong></div></div>
                    <div className="stat-card"><span className="stat-icon">🌡</span><div><span className="stat-label">Temperature</span><strong>{displayedCurrent}°{temperatureUnit} <small>/ {otherCurrent}°{otherUnit}</small></strong></div></div>
                    <div className="stat-card"><span className="stat-icon">◷</span><div><span className="stat-label">Forecast period</span><strong>{forecasts.length} days</strong></div></div>
                </section>
                <div className="table-card">
                    <div className="table-heading"><div><p className="eyebrow">NEXT FIVE DAYS</p><h2>Detailed forecast</h2></div><div className="table-actions"><div className="unit-toggle" role="group" aria-label="Temperature unit"><button className={temperatureUnit === 'C' ? 'selected' : ''} type="button" onClick={() => setTemperatureUnit('C')} aria-pressed={temperatureUnit === 'C'}>°C</button><button className={temperatureUnit === 'F' ? 'selected' : ''} type="button" onClick={() => setTemperatureUnit('F')} aria-pressed={temperatureUnit === 'F'}>°F</button></div><span className="live-badge"><span /> Live</span></div></div>
                    <div className="table-scroll"><table><thead><tr><th>Date</th><th>Conditions</th><th>High</th><th>Low</th></tr></thead><tbody>{forecasts.map(forecast => { const high = temperatureUnit === 'C' ? forecast.highC : toFahrenheit(forecast.highC); const low = temperatureUnit === 'C' ? forecast.lowC : toFahrenheit(forecast.lowC); return <tr key={forecast.date}><td><strong>{formatDate(forecast.date)}</strong></td><td><span className="condition-icon" aria-hidden="true">☀</span>{forecast.summary}</td><td><strong>{high}°{temperatureUnit}</strong></td><td>{low}°{temperatureUnit}</td></tr>; })}</tbody></table></div>
                </div>
            </>}
            </>}
        </main>
    );
}

async function getLocationLabel(latitude: number, longitude: number) {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        if (!response.ok) return 'Your location';

        const data = await response.json() as ReverseGeocodeResponse;
        const city = data.city || data.locality;
        if (!city) return 'Your location';

        return data.principalSubdivision
            ? `${city}, ${data.principalSubdivision}`
            : city;
    } catch {
        return 'Your location';
    }
}

function toFahrenheit(celsius: number) { return Math.round((celsius * 9) / 5 + 32); }

function formatDate(date: string) { return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }

function weatherSummary(code: number) {
    if (code === 0) return 'Clear sky';
    if ([1, 2, 3].includes(code)) return 'Partly cloudy';
    if ([45, 48].includes(code)) return 'Foggy';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
    if ([95, 96, 99].includes(code)) return 'Thunderstorm';
    return 'Mixed conditions';
}

export default App;