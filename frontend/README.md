# Payment Routing System

An Angular frontend for the Flask-based payment routing backend in this repository. The application is designed as a role-aware premium fintech workspace with JWT-backed sign-in, payment CRUD workflows, analytics, responsive CSS, light/dark theming, and submission-ready documentation.

## Feature summary

- Angular standalone architecture with lazy-loaded routes
- Plain CSS design system with a distinctive operations-dashboard layout
- Premium fintech redesign with a branded login showcase, holographic card styling, and subtle CSS motion
- Login and merchant-only registration
- JWT session storage plus automatic `Authorization` and `Role` headers
- Configurable backend JWT expiry with `JWT_EXPIRY_MINUTES` defaulting to `60`
- Payments workspace with search, filters, sorting, URL query params, pagination, and detail view
- Admin-only deletion, merchant/admin mutation flows, finance/admin analytics access
- Analytics board for payment volume, provider latency, and payment status
- Automated tests and coursework-friendly docs

## Demo credentials

- `admin`: `parth@payments.com` / `admin123`
- `finance`: `montu@payments.com` / `finance123`
- `merchant`: `arjun@payments.com` / `pass123`

## Local setup

Backend JWT expiry is environment-configurable:

```bash
export JWT_EXPIRY_MINUTES=60
```

Use Node `20.x` or `22.x` for the Angular toolchain. The current machine originally had Node `25`, which is not supported by Angular 21 and can cause builder crashes.

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

The Angular dev server proxies `/api/*` to `http://127.0.0.1:5000`, so the frontend can call the Flask API without hard-coding a cross-origin base URL.

## Useful scripts

- `npm start` - starts the Angular dev server with proxy support
- `npm run build` - creates the production build
- `npm test` - runs unit tests once
- `npm run test:watch` - runs tests in watch mode

## Coursework support

Supporting documentation for the submission pack lives in [`docs/`](./docs):

- `APPLICATION_OVERVIEW.md`
- `API_ENDPOINTS.md`
- `TESTING.md`
- `VIDEO_CHECKLIST.md`

These files are structured so they can be adapted into PDF submission artefacts later.
