import { useEffect, useState, type FormEvent } from 'react';
import './App.css';

interface Forecast {
    date: string;
    temperatureC: number;
    temperatureF: number;
    summary: string;
}

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [forecasts, setForecasts] = useState<Forecast[]>();
    const [username, setUsername] = useState('demo');
    const [password, setPassword] = useState('password');
    const [loginError, setLoginError] = useState('');

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
            <main>
                <h1>Sign in</h1>
                <form onSubmit={login}>
                    <div>
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            value={username}
                            onChange={event => setUsername(event.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                        />
                    </div>
                    {loginError && <p role="alert">{loginError}</p>}
                    <button type="submit">Sign in</button>
                </form>
                <p>Demo credentials: demo / password</p>
            </main>
        );
    }

    const contents = forecasts === undefined
        ? <p><em>Loading... Please refresh once the ASP.NET backend has started. See <a href="https://aka.ms/jspsintegrationreact">https://aka.ms/jspsintegrationreact</a> for more details.</em></p>
        : <table className="table table-striped" aria-labelledby="tableLabel">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Temp. (C)</th>
                    <th>Temp. (F)</th>
                    <th>Summary</th>
                </tr>
            </thead>
            <tbody>
                {forecasts.map(forecast =>
                    <tr key={forecast.date}>
                        <td>{forecast.date}</td>
                        <td>{forecast.temperatureC}</td>
                        <td>{forecast.temperatureF}</td>
                        <td>{forecast.summary}</td>
                    </tr>
                )}
            </tbody>
        </table>;

    return (
        <div>
            <button type="button" onClick={logout}>Sign out</button>
            <h1 id="tableLabel">Weather forecast</h1>
            <p>This component demonstrates fetching data from the server.</p>
            {contents}
        </div>
    );

    async function populateWeatherData() {
        const response = await fetch('weatherforecast');
        if (response.ok) {
            const data = await response.json();
            setForecasts(data);
        }
    }
}

export default App;