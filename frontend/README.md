# Payment Routing System Frontend

Angular frontend for the Flask payment routing API in this repository.

## What it does

- JWT login and merchant registration
- Role-based routes and UI
- Payment create, edit, delete, search, filtering, and detail view
- Nested customer details and provider attempts
- Analytics for:
  - global admin and finance access
  - merchant-scoped access for the signed-in merchant
- Light and dark theme support
- Automated unit tests

## Frontend structure

The app keeps a simple Angular structure:

- `src/app/core`
  - services
  - guards
  - interceptor
  - models
  - constants
- `src/app/features`
  - auth
  - dashboard
  - payments
  - analytics
  - unauthorized
- `src/app/shared`
  - reusable UI components

## Key frontend behaviour

- Payment mutation requests use `application/x-www-form-urlencoded`
- Nested fields such as `customer_details` and `provider_attempts` are serialized from the Angular forms and sent to the backend
- The `Authorization` and `Role` headers are attached through the interceptor
- Analytics refreshes after payment changes and provider attempt updates

## Local setup

Use Node `20.x` or `22.x` for the Angular toolchain when possible.

1. Start the Flask backend from the repository root:

```bash
cd api
venv/bin/python app.py
```

2. Start the Angular frontend:

```bash
cd frontend
npm install
npm start
```

The Angular dev server proxies `/api/*` to `http://127.0.0.1:5000`.

## Scripts

- `npm start`
- `npm run build`
- `npm test`
- `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`
