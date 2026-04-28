# Auth0 Production Identity Upgrade Plan

This document describes a future production identity upgrade path for Payment Routing System. Auth0 is not implemented in the submitted coursework version. The current application uses Flask-issued custom JWT authentication so the project remains stable, fully local, and reliable for assessment.

## Why Auth0 Would Be Used In Production

Auth0 would be introduced to move identity management out of the application code and into a dedicated production identity platform.

Production benefits:

- hosted login managed outside the Angular application
- external identity providers such as Google, Microsoft, or enterprise SSO
- MFA readiness for finance and administrator accounts
- token lifecycle management including expiry, refresh, and revocation patterns
- tenant-managed users, roles, login policies, and security settings

For a fintech operations tool, this is valuable because identity is a high-risk boundary. Admin and finance users can view global payment data, while merchant users must only access their own records. A managed identity provider would reduce custom security surface area in a production deployment.

## Current Authentication Summary

The current submitted version uses a custom JWT flow implemented by the Flask API and consumed by the Angular frontend.

Current flow:

1. The user submits the Angular login form.
2. Flask validates the email and password against MongoDB user records.
3. Flask issues a custom JWT containing identity and role data.
4. Angular stores the session and uses the token for authenticated requests.
5. The HTTP interceptor attaches the token as a bearer token.
6. Angular guards enforce authenticated and role-specific route access.
7. The active role controls admin, finance, and merchant permissions.

The role model is:

| Role | Access |
| --- | --- |
| `admin` | Full payment operations access |
| `finance` | Global payment review, approval, rejection, and analytics |
| `merchant` | Merchant-scoped payment access only |

Merchant scoping is based on the authenticated email. This prevents merchant users from seeing global payment records.

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

The future architecture would keep Angular and Flask separated:

```text
Angular SPA -> Auth0 Hosted Login -> Auth0 Access Token -> Flask API -> MongoDB
```

Auth0 would issue RS256-signed access tokens for the configured API audience. Flask would validate those tokens before serving protected payment and analytics endpoints.

## Backend Migration Plan

The Flask API would need a focused authentication-layer change while preserving the existing endpoint contracts.

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

The important rule is that merchant scoping must remain server-side. Even with Auth0, the backend must continue to enforce `created_by = authenticated_email` for merchant users.

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

The goal would be to keep most feature components unchanged. Payments, analytics, dashboard, RBAC UI controls, and merchant scoping should continue to depend on the app-level auth abstraction rather than on Auth0 directly.

## Risks And Migration Considerations

| Risk | Impact |
| --- | --- |
| Tenant setup dependency | The app would depend on a correctly configured external Auth0 tenant |
| Callback URL configuration | Incorrect local or deployed URLs can break login redirects |
| Role claim mapping | Missing or misnamed role claims could break RBAC decisions |
| Backend JWT validation changes | Flask must validate RS256 tokens, JWKS keys, issuer, and audience correctly |
| Local demo reliability | External identity dependency can make coursework demos less predictable |

These risks are manageable in production but are unnecessary for the current assessed version.

## Reason For Retaining Custom JWT For Coursework

The submitted version keeps custom Flask JWT authentication because it is:

- stable for local development and assessment
- fully testable without an external tenant
- reliable during live demos and marking
- aligned with the existing Flask API and Angular services
- sufficient to demonstrate authentication, guards, interceptor usage, RBAC, and merchant-scoped data access

Auth0 remains a strong production hardening path, but it is deliberately documented rather than implemented in this coursework submission.
