# 0004. Routing on GitHub Pages: BrowserRouter with a 404.html fallback

- Status: Accepted
- Date: 2026-11-02

## Context

- The task filter is a route (`/`, `/active`, `/completed`), so URLs are part of the UI and should be clean and shareable.
- The app is deployed as static files to GitHub Pages under a project subpath (`/<repo>/`).
- GitHub Pages has no server-side rewrites: a deep link such as `/<repo>/active` returns 404.

## Decision

- Use the React Router data router via `createBrowserRouter`, with `basename` taken from `import.meta.env.BASE_URL`.
- Vite `base` is read from the `BASE_PATH` environment variable (default `/`). CI sets it to the Pages base path, so the repository name is not hard-coded.
- Add `public/404.html` with a redirect script (the well-known spa-github-pages technique). It encodes the requested path into a query string and redirects to the app root.
- A small inline script in `index.html` restores the original URL with `history.replaceState` before the router starts.
- `404.html` is added in the deployment stage.

## Alternatives considered

- **HashRouter / `createHashRouter`.** Works without any fallback, but URLs become `/#/active`. This undermines the "filter is a route" idea, is worse for sharing, and hash fragments are ignored by many tools. Kept as the fallback if the redirect approach causes issues.
- **Copying `index.html` to `404.html`.** Simpler, but the deep-link response still has HTTP status 404 and renders the app from a 404 document.
- **Another host with rewrites (Netlify, Vercel, Cloudflare Pages).** Solves the problem properly, but adds an external account and service. GitHub Pages keeps the code and the deployment in one place.

## Consequences

- Positive: clean, shareable URLs.
- Negative: one extra redirect on a cold deep link (brief flash, one extra request).
- Negative: deep links return HTTP 404 before the redirect. This is acceptable for a client-only app without SEO needs.
- The base path must stay consistent between Vite and the router; `BASE_URL` is the single source.
