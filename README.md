# Rentpply

Rentpply is a student housing app for discovering accommodation, finding roommates, handling rental paperwork, and managing property operations. It is built with React, TypeScript, and Vite, and is configured as a Cloudflare Worker serving Vite static assets. The public landing page is at `/`; the interactive platforms are at `/app`. The current prototype includes separate Student, Tenant, Owner, and Admin roles.

## Run locally

Use Node.js 20.19+ or 22.12+ with npm:

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`, then preview it with `npm run preview`.

## Cloudflare Workers

The repository is configured for Workers Builds. Use build command `npm run build` and deploy command `npx wrangler deploy`. `wrangler.jsonc` identifies the Worker as `rentpply`, publishes the Vite `dist/` output as static assets, and routes app paths such as `/app` back to the SPA entry point. The Worker name must match the name configured in Cloudflare.

## Supabase and backend status

Supabase is planned for authentication and shared Postgres data, but it is not connected yet. Current bookings, saved places, preferences, agreements, and sample payments are stored in this browser only. Payment, verification, SMS, and email actions are demos, not live services. Do not enter real payment details or confidential personal data into the demo.

When backend work begins, add Supabase credentials as Cloudflare environment variables and connect typed data services with Row Level Security policies. Keep service role keys and other privileged secrets out of browser code.

## Project structure

- `src/app/` — application startup and root composition
- `src/components/` — public landing page and shared React app shell
- `src/features/prototype/` — isolated prototype workflows and sample data
- `src/styles/` — global design tokens and responsive styles
- `src/types/` — Vite and TypeScript declarations
- `wrangler.jsonc` — Cloudflare Worker name, static asset directory, and SPA routing
