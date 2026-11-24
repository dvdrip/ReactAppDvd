# Security Review

**Date:** 2026-11-24

**Branch:** `feature/user-specific-meal-plans`

**Scope:** Meal-plan feature changes, registration response handling, authentication configuration, and Vite development proxy.

## Findings

| # | Severity | Location | Finding and impact | Status and recommended action |
|---|---|---|---|---|
| 1 | Medium | `ReactAppDvd.Server/Program.cs:102-114` | Registration failures return HTTP 400 while successful account creation returns HTTP 200. Although the response body is generic, an unauthenticated caller can distinguish an available identifier from an already-registered username or email by status code. | **Unresolved.** Make registration outcomes externally indistinguishable. Do not issue a session cookie only on successful creation if the response is intended to be indistinguishable; an out-of-band verification flow is an alternative. |
| 2 | Low | `ReactAppDvd.Server/Program.cs:37-48` | Authentication-cookie security attributes are implicit. Framework defaults may mitigate exposure, so this is a hardening recommendation rather than a confirmed vulnerability. | **Open hardening recommendation.** Explicitly configure intended `HttpOnly`, `Secure`, and `SameSite` behavior, including HTTPS-only cookies in production. Verify forwarded-header behavior when TLS terminates at a proxy. |
| 3 | Low | `reactappdvd.client/vite.config.ts:49-53` | The development proxy sets `secure: false`, disabling validation of the HTTPS backend certificate and potentially allowing interception in a compromised local/DNS environment. This is a development hardening concern, not a confirmed production vulnerability. | **Open hardening recommendation.** Enable certificate validation where feasible, or constrain and document the local-development exception. |

## Review limits

This was a static review. It did not include a dependency scan, live deployment verification, or production proxy/TLS configuration review. Automated tests and builds are separate quality evidence and do not establish security coverage.
