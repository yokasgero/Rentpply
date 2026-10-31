# Rentpply

Rentpply is a student housing app for discovering accommodation, finding roommates, handling rental paperwork, and managing property operations. It is built with React, TypeScript, and Vite, and is structured for Cloudflare Pages hosting. The current user-facing prototype includes separate Student, Tenant, Owner, and Admin roles.

## Run locally

Use Node.js 20.19+ or 22.12+ with npm:

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`, then preview it with `npm run preview`.

## Cloudflare Pages

Connect the repository to Cloudflare Pages with build command `npm run build` and output directory `dist`. The app is a single-page app; `public/_redirects` keeps application routes on the app entry point.

## Supabase and backend status

Supabase is planned for authentication and shared Postgres data, but it is not connected yet. Current bookings, saved places, preferences, agreements, and sample payments are stored in this browser only. Payment, verification, SMS, and email actions are demos, not live services. Do not enter real payment details or confidential personal data into the demo.

When backend work begins, add Supabase credentials as Cloudflare environment variables and connect typed data services with Row Level Security policies. Keep service role keys and other privileged secrets out of browser code.

## Project structure

- `src/app/` — application startup and root composition
- `src/components/` — shared React app shell
- `src/features/prototype/` — isolated prototype workflows and sample data
- `src/styles/` — global design tokens and responsive styles
- `src/types/` — Vite and TypeScript declarations
- `public/` — static files copied to the production build
