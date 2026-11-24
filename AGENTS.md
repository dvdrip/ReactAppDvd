# Repository Engineering Instructions

## Project architecture

- `ReactAppDvd.slnx` contains `ReactAppDvd.Server` and `reactappdvd.client`.
- `ReactAppDvd.Server` is an ASP.NET Core application targeting .NET 10. Its `Program.cs` configures minimal API authentication endpoints and maps controllers. It uses ASP.NET Core Identity, cookie authentication, EF Core, and SQLite. `ApplicationDbContext` extends `IdentityDbContext<IdentityUser>`.
- `reactappdvd.client` is a React 19 and TypeScript application built with Vite. Its source is under `src/`, with the main application in `App.tsx` and the meal-plan page in `components/MealPlanPage.tsx`.
- The server project references the client project, builds the client during a normal build, serves static assets, and falls back to the SPA entry point.
- The Vite development server proxies configured application routes to ASP.NET Core. The client also calls external weather, geocoding, reverse-geocoding, and image services directly.
- The repository currently has no tracked backend test project or test files. The client has no test script, test dependencies, or test files. The Visual Studio JavaScript project declares Vitest metadata, but Vitest is not included in the client package manifest.

## Existing conventions and commands

- Follow the nearby code's conventions and keep changes scoped. The client uses TypeScript, React function components, hooks, and CSS alongside components.
- Backend configuration and endpoint mappings are currently concentrated in `Program.cs`; database setup is in `ApplicationDbContext.cs`.
- Use the existing client scripts: `npm run lint` and `npm run build` from `reactappdvd.client`.
- Use `dotnet build ReactAppDvd.slnx` from the repository root for the solution build. The server build invokes the client build.
- Do not claim tests passed when no tests were run. At present, there is no configured test suite to run.
- No additional formatting, analyzer, or test tooling should be assumed to exist. Inspect project manifests and repository configuration before choosing commands.

## Development standards

- Start each change by examining the relevant source, configuration, and current branch diff. Establish the request, acceptance criteria, affected files, risks, and a focused plan before implementation.
- Preserve the current React/Vite SPA and ASP.NET Core/SQLite architecture unless an approved plan justifies a change. Obtain the user's approval before major architectural changes or introducing dependencies/frameworks.
- Keep code changes minimal and consistent with existing patterns. Avoid unnecessary abstractions and unrelated edits.
- Maintain type safety. Validate untrusted input at the server boundary, return appropriate HTTP status codes, and avoid exposing internal details in responses.
- Keep frontend state and errors explicit, use semantic accessible markup, and preserve the existing API contract unless a requirement approves a change.
- Do not introduce secrets or copy sensitive values from local configuration, logs, or examples into source or documentation. Never treat development settings as production-safe.
- Follow secure defaults for authentication, authorization, cookies, data handling, logging, and error responses. Review security implications of endpoints and external service calls.

## Testing and quality gates

- For frontend changes, run the relevant available lint and build commands. Add or run component/integration tests only when suitable test tooling is present or its introduction has been approved.
- For backend changes, run the solution build and any relevant existing tests. No backend tests are currently configured; do not report them as passing.
- For cross-stack changes, verify the client/server contract and run relevant available checks on both sides.
- Report each validation as **PASS** only when it was actually executed successfully. Otherwise mark it **FAIL**, **NOT RUN**, or **NOT APPLICABLE**, with the reason and command/evidence where applicable.
- Review accessible interaction, error and invalid-input handling, regressions, and the final diff. Do not equate a successful build with test or security coverage.
- Do not mark work ready with unresolved critical or high-severity findings.

## Change management

- Work only on the task's approved feature branch. Do not push, merge, or make release changes unless the user explicitly requests them.
- Do not modify application code while setting up or updating engineering guidance unless explicitly requested.
- Preserve pre-existing user changes; do not revert unrelated work or generated/user-specific files.
- Keep commits and pull requests focused. Report changed files, validation evidence, unresolved risks, and any checks that could not be run.

## Team workflow

- Follow [docs/engineering-workflow.md](docs/engineering-workflow.md) for role handoffs, independent reviews, iteration, validation, and release readiness.
- The specialized Copilot agents under `.github/agents/` are role prompts, not an automated pipeline. The user or coordinator must invoke and coordinate them; each role must report evidence and limits honestly.
- The Release Gatekeeper provides a readiness recommendation only. It must not merge or push changes.
