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

## Accounts and workspaces

Rentpply has four account roles: tenant, student, property owner, and administrator. Students use the tenant housing features with campus-focused labels. Owners only see their own property workspace. Only administrators can switch between platform views or manage all records. Public signup can create tenant, student, or owner accounts; administrator access must be assigned by an existing administrator.

## Supabase

The active app uses the Supabase client in `src/lib/supabase.js` and the owner/admin data workspace in `src/live-portal.js`. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your project's Connect panel. Never add a Supabase secret or service role key to browser code or a `VITE_` variable.

Database migrations live in `supabase/migrations/`. The current production project has these migrations applied. For future schema changes, add a new migration and deploy it with `supabase db push --linked` before publishing app code that depends on it. Row Level Security protects profiles, listings, bookings, payments, identity files, and admin actions.

Listings, accounts, saved listings, roommate requests, agreements, payment requests, maintenance, bills, and inventory are stored in Supabase. Checkout records a payment claim and transaction reference only; it does not charge a card or move mobile money. Owners must verify receipt before confirming a request. Identity documents are stored in a private bucket and accessible only to their owner and administrators.

For Cloudflare Workers Builds, configure the same `VITE_` variables as build environment variables. Pushing application code to the connected GitHub branch starts the configured automatic deployment.
