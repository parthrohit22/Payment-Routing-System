# Auth0 Production Identity Upgrade Plan

This document describes a future production identity upgrade path for Payment Routing System. Auth0 is not implemented in the submitted coursework version. The current application uses Flask-issued custom JWT authentication so the project remains stable, local, and reliable for assessment.

## Why Auth0 Would Be Used In Production

Auth0 would move identity management out of application code and into a dedicated identity platform.

Production benefits:

- hosted login managed outside the Angular application
- external identity providers such as Google, Microsoft, or enterprise SSO
- MFA readiness for finance and administrator accounts
- token lifecycle management including expiry, refresh, and revocation patterns
- tenant-managed users, roles, login policies, and security settings

For a fintech operations tool, identity is a high-risk boundary. Admin and finance users can view global payment data, while merchants must only access their own records. A managed identity provider would reduce custom authentication surface area, but it would not replace application-level RBAC or server-side merchant scoping.

## Current Authentication Summary

The submitted version uses a custom JWT flow implemented by Flask and consumed by Angular.

Current flow:

1. The user submits the Angular login form.
2. Flask validates the email and password against MongoDB user records.
3. Flask issues a custom JWT containing identity and role data.
4. Angular stores the session and uses the token for authenticated requests.
5. The HTTP interceptor attaches the token as a bearer token.
6. Angular guards enforce authenticated and role-specific route access for navigation.
7. Flask enforces role-specific data access and mutation rules on protected endpoints.

The role model is:

| Role | Access |
| --- | --- |
| `admin` | Global payment visibility, core payment edits, provider attempts, status changes, payment deletion |
| `finance` | Global payment review, approval/rejection, provider attempts, and analytics |
| `merchant` | Merchant-scoped payment visibility, payment creation, analytics for own records, and own account deletion |

Merchant scoping is based on the authenticated email. This prevents merchant users from seeing global payment records even if the frontend is bypassed.

## Future Auth0 Architecture

A production Auth0 migration would introduce the following identity components:

| Auth0 Component | Purpose |
| --- | --- |
| Auth0 tenant | Owns users, applications, roles, login policies, and identity provider configuration |
| SPA application | Represents the Angular frontend |
| API audience | Represents the Flask API as a protected resource |
| Callback URLs | Allow Auth0 to redirect users back to Angular after login |
| Logout URLs | Allow Auth0 to redirect users back to Angular after logout |
| Custom role claim | Carries `admin`, `finance`, or `merchant` role information in a namespaced claim |

Future architecture:

```text
Angular SPA -> Auth0 Hosted Login -> Auth0 Access Token -> Flask API -> MongoDB
```

Auth0 would issue RS256-signed access tokens for the configured API audience. Flask would validate those tokens before serving protected payment, analytics, and account endpoints.

## Backend Migration Plan

The Flask API would need a focused authentication-layer change while preserving endpoint behaviour.

Backend migration steps:

1. Configure the Auth0 domain and API audience through environment variables.
2. Replace local HS256 custom JWT decoding with RS256 Auth0 JWT validation.
3. Fetch and cache Auth0 signing keys from the tenant JWKS endpoint.
4. Validate issuer, audience, expiry, and signature for every protected request.
5. Read the authenticated email from token claims.
6. Read the application role from a namespaced custom claim such as `https://payment-routing-system.example/role`.
7. Attach the resolved identity to the Flask request context.
8. Preserve existing RBAC checks for `admin`, `finance`, and `merchant`.
9. Preserve merchant scoping by filtering merchant records with the authenticated email.

The important rule is that merchant scoping and mutation authorization must remain server-side. Auth0 can issue identity, but Flask must still decide which payments and account actions are allowed.

## Frontend Migration Plan

The Angular frontend would use the Auth0 Angular SDK in a future production version. This package is intentionally not installed in the coursework submission.

Frontend migration steps:

1. Configure Auth0 domain, client ID, callback URL, logout URL, and API audience.
2. Replace the custom login/register form flow with Auth0 redirect login.
3. Use the SDK to obtain access tokens for Flask API requests.
4. Keep the interceptor concept so API calls still receive a bearer token consistently.
5. Keep route guards as the boundary for protected pages.
6. Keep role-based UI decisions behind `AuthService` so feature components do not depend directly on Auth0 SDK details.
7. Map the Auth0 custom role claim into the existing role model used by the app.

The goal would be to keep feature components stable. Payments, analytics, dashboard, RBAC UI controls, merchant-only account deletion, and merchant scoping should continue to depend on the app-level auth abstraction rather than Auth0 SDK details.

## Risks And Migration Considerations

| Risk | Impact |
| --- | --- |
| Tenant setup dependency | The app would depend on a correctly configured external Auth0 tenant |
| Callback URL configuration | Incorrect local or deployed URLs can break login redirects |
| Role claim mapping | Missing or misnamed role claims could break RBAC decisions |
| Backend JWT validation changes | Flask must validate RS256 tokens, JWKS keys, issuer, and audience correctly |
| Local demo reliability | External identity dependency can make coursework demos less predictable |

These risks are manageable in production but unnecessary for the current assessed version.

## Reason For Retaining Custom JWT For Coursework

The submitted version keeps custom Flask JWT authentication because it is:

- stable for local development and assessment
- fully testable without an external tenant
- reliable during live demos and marking
- aligned with the existing Flask API and Angular services
- sufficient to demonstrate authentication, guards, interceptor usage, RBAC, controlled mutations, and merchant-scoped data access

Auth0 remains a production hardening path, but it is deliberately documented rather than implemented in this coursework submission.
