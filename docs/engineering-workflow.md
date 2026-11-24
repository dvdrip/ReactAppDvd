# AI Engineering Workflow

This workflow coordinates the repository's Technical Lead, Senior Full-Stack Developer, Senior Code Reviewer, QA Engineer, Security Engineer, and Engineering Manager / Release Gatekeeper Copilot custom agents. Agent definitions are prompts for human- or coordinator-invoked roles; they do not automatically start agents or enforce checks.

## 1. Intake and planning

1. Record the feature request or bug report and clarify ambiguous behavior.
2. The Technical Lead reads `AGENTS.md`, inspects the relevant code and configuration, and identifies affected components, dependencies, API/data contracts, and risks.
3. The Technical Lead produces an implementation plan with testable acceptance criteria, scope boundaries, proposed validation, and any user decisions needed.
4. Obtain user approval of the plan before implementation. Obtain explicit user approval before major architectural changes or introducing dependencies/frameworks.

## 2. Implementation

5. The Senior Full-Stack Developer implements the approved scope on the task's feature branch, following existing patterns and preserving unrelated work.
6. The developer adds or updates focused tests when suitable infrastructure is present and runs the relevant available checks.
7. The developer reports changed files, commands actually run, results, and checks that are unavailable or were not run.

## 3. Independent review

8. The Senior Code Reviewer independently inspects the request, acceptance criteria, full diff, and surrounding code. Findings include severity, location, impact, and remediation.
9. The QA Engineer maps acceptance criteria to scenarios and executes available tests and validation. It records exact commands and actual outcomes, including unavailable tests.
10. The Security Engineer independently reviews affected trust boundaries, authentication/authorization, validation, data exposure, errors, configuration, secrets, and dependency risks.
11. Reviewers report independently; one role's approval does not substitute for another role's assessment.

## 4. Finding resolution and iteration

12. The Release Gatekeeper consolidates duplicate findings without dropping their evidence or severity, identifies valid issues, and assigns each to the developer.
13. The Senior Full-Stack Developer fixes approved findings, explains any disputed finding with evidence, and reruns the affected checks.
14. The relevant reviewers re-check fixes. Repeat this loop until all mandatory gates pass or the remaining blockers are explicitly reported.

## 5. Validation and readiness

15. Run all relevant available automated checks against the final diff. For a full-stack change, check client/server contract compatibility and regressions as well as each affected side.
16. The Release Gatekeeper verifies evidence and produces the final readiness report described below. A successful build alone does not establish test coverage, security approval, or PR readiness.
17. The readiness report is a recommendation only. The agents must not push, merge, or automatically approve a PR.

## Severity and disposition

- **Critical / High:** Blocks readiness until resolved and re-reviewed.
- **Medium / Low:** Record impact and disposition; resolve when required by the approved plan or release owner.
- Every finding identifies affected file/location, evidence, impact, remediation, and status (open, fixed, rejected with rationale, or accepted risk with owner).
- The gatekeeper removes duplicate presentations but retains all distinct impacts and evidence.

## Quality gates and validation evidence

Report each applicable check as **PASS**, **FAIL**, **NOT RUN**, or **NOT APPLICABLE**, with an actual command/result or explanation. Never report a check as passing unless it executed successfully.

### Current repository checks

Run from the repository root unless noted:

| Check | Current command/setup | Notes |
| --- | --- | --- |
| Frontend lint | `npm run lint` from `reactappdvd.client` | ESLint is configured for TypeScript, React Hooks, and React Refresh. |
| Frontend build/type check | `npm run build` from `reactappdvd.client` | Runs `tsc -b` and `vite build`. |
| Solution build | `dotnet build ReactAppDvd.slnx` | The server project builds the client as part of the solution build. |
| Frontend component/integration tests | Not configured | There is no npm test script, test dependency, or tracked test file. Visual Studio project metadata says Vitest, but Vitest is not installed in the package manifest. |
| Backend unit/integration tests | Not configured | There is no tracked .NET test project or test file. |

Use the client's own scripts from PowerShell:

```powershell
Set-Location .\reactappdvd.client
npm run lint
npm run build
```

Then build the full solution from the repository root:

```powershell
Set-Location ..
dotnet build .\ReactAppDvd.slnx
```

### Required review dimensions

- **Frontend:** Build and lint; component/integration tests when configured; React state and error handling; semantic accessibility; user-visible behavior and regressions.
- **Backend:** Successful .NET build; unit/integration tests when configured; dependency injection; validation; HTTP status semantics; authentication/authorization; secure API behavior; logging and exception handling.
- **Full application:** API contract compatibility; frontend/backend behavior; regression risks; no unrelated changes; no unresolved Critical or High findings.

If a requested gate has no supporting test infrastructure or tool, report it as **NOT RUN** and describe the gap. Do not install tooling as part of an unrelated feature without approval.

## Recommendations (not currently installed)

The following are optional gaps, not existing project capabilities:

- When test infrastructure is approved, consider Vitest and React Testing Library for the client and a .NET test project (for example xUnit with ASP.NET Core integration-test support) for the server.
- Consider browser-level end-to-end testing and automated accessibility checks if the project adopts a browser test runner.
- Consider adding explicit .NET analyzers and dependency/advisory scanning to CI if the team approves those tools and workflow changes.

Do not claim these checks ran until the tools are adopted and executed.

## Final PR readiness report

The Release Gatekeeper reports:

1. **Recommendation:** READY or NOT READY, with rationale.
2. **Scope:** Request, acceptance criteria, and changed-file summary.
3. **Review coverage:** Technical plan, independent code review, QA, and security review status.
4. **Findings:** Consolidated issues, severity, resolution/re-review status, and accepted risks.
5. **Validation:** Exact commands and actual outcomes, plus every applicable NOT RUN / NOT APPLICABLE check.
6. **Remaining risks:** Gaps, manual checks, or decisions needed.

Readiness requires all required available quality gates to pass, required independent reviews to be complete, no unresolved Critical or High findings, no unrelated changes, and explicit disclosure of any unavailable checks.
