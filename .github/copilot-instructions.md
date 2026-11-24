Follow the repository-wide engineering standards in `AGENTS.md` and the handoffs and quality gates in `docs/engineering-workflow.md`.

Inspect the existing implementation before proposing or making changes. Preserve the current React/TypeScript/Vite client and ASP.NET Core/SQLite server architecture unless the user approves an architectural change. Do not modify application code during workflow setup.

Report only checks that were actually executed as passing. The repository currently has frontend lint/build scripts but no configured test suites; clearly mark unavailable or unrun checks. Do not add dependencies, frameworks, push, or merge without approval.
