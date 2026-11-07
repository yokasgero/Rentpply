# Rentpply

Rentpply is a student housing demo for discovering accommodation, finding roommates, handling rental paperwork, and managing property operations. The website is implemented in the self-contained `index.html` file, which contains the current design, styles, sample data, and interactions.

## Run locally

Use Node.js 20.19+ or 22.12+ with npm:

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`, then preview it with `npm run preview`.

## Cloudflare Workers

The repository is configured for Workers Builds. Use build command `npm run build` and deploy command `npx wrangler deploy`. `wrangler.jsonc` publishes the Vite `dist/` output as static assets and serves the single-page site at app paths.

## Demo data

Listings, people, payments, verification, messaging, and rental operations use browser-side sample data. These actions are demonstrations, not live services. Do not enter real payment details or confidential personal data.

## Supabase connection

The Supabase JavaScript client is installed and initialized by `src/lib/supabase.js`. To configure it locally, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project's Connect panel. The browser client is available as `window.rentpplySupabase` when configured.

For Cloudflare Workers Builds, add those same `VITE_` variables as build environment variables so Vite can include the project URL and publishable key in the static site. Never add a Supabase secret or service role key to browser code or a `VITE_` variable. Database tables and app workflows are not connected yet; add Row Level Security policies before exposing tables to the client.
