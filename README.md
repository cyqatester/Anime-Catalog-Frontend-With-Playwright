# Anime Catalog Frontend with Playwright

React + Vite + TypeScript frontend for the Anime Catalog Spring Boot backend.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173/login to sign in. After authentication, the app opens at `/dashboard`, where the anime catalog is displayed by default.

Admins can also open the overview, anime catalog, genres, and user management from the sidebar. The Genres table displays 10 rows per page.

## End-to-end tests

The Playwright tests run against a local Vite server and mock the backend API.
They cover authentication, role-based navigation, catalog search, genre pagination,
and add/edit/delete flows for anime, genres, and users. Install the Chromium browser
once, then run the test suite:

```bash
npx playwright install chromium
npm run test:e2e
```

Tests, page objects, fixtures, and Playwright configuration are in `e2e/` and `playwright.config.ts`.

## Continuous integration

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on pushes and pull
requests. It installs dependencies and Playwright Chromium, builds the frontend,
and runs the end-to-end tests.

## Authentication contract required

The login page calls `POST ${VITE_API_BASE_URL}${VITE_AUTH_ENDPOINT}` (default `POST http://localhost:8080/api/auth/login`) with:

```json
{ "username": "your-username", "password": "your-password" }
```

The backend should return a signed access token and the authenticated user's role. The frontend accepts either a top-level response or a `data` wrapper, and supports `token`, `accessToken`, `jwt`, or `access_token` for the token field. Example response:

```json
{
  "token": "signed-jwt-access-token",
  "user": {
    "id": 1,
    "name": "Catalog Admin",
    "username": "admin",
    "role": "ADMIN"
  }
}
```

The role must be `ADMIN` or `STANDARD`. The frontend stores the session in `sessionStorage` and sends `Authorization: Bearer <token>` on API requests. Set `VITE_AUTH_ENDPOINT` to the actual backend login route if it differs.

## Role access in the UI

- **ADMIN:** overview, anime catalog, genres, and user management; create/edit/delete controls are available.
- **STANDARD:** anime catalog and search only; no overview, genre/user pages, or management controls. Genre names are fetched as read-only lookup data to display anime metadata.

## Backend security is mandatory

These frontend restrictions are for usability, not security. Spring Security must validate the token and enforce authorization on every endpoint:

- `ADMIN` may access anime/genre/user management endpoints.
- `STANDARD` may only `GET` anime (and any read-only lookup endpoint needed by the UI).
- Reject unauthorized requests server-side with `401` or `403`.

Do not rely on the old `X-Username` demo header. The frontend no longer sends it. Implement a real login endpoint and token-based authentication in Spring Boot before using this app. CORS must allow `http://localhost:5173` and the `Authorization` header.

## API assumptions

- `GET /api/anime` (optional `title` query parameter)
- `GET /api/genres` (read-only lookup for anime genre labels)
- Admin-only genre and user CRUD endpoints
- Anime CRUD endpoints for admins

Check Swagger and update the API adapters if your backend uses different paths or DTOs.
