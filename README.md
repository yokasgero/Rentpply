# Rentpply

Rentpply is a housing platform for Uganda for discovering hostels, rentals and short stays, finding roommates, handling rental paperwork, and managing property operations. The website is implemented in the self-contained `index.html` file, which contains the current design, styles, sample data, and interactions.

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

## Platform logic

The rules come from "Rentpply: Platform Logic" and are enforced in the database (`supabase/migrations/20261109000000_platform_logic.sql`), not only in the page.

- **Tenants** book in four steps: listing, agreement, payment, status. Hostels are booked per semester (4 months), rentals per month and short stays per night. The total is rent for the period, plus a 3% service fee on the rent, plus the refundable deposit set in the property's agreement. The room shows "To be assigned" until the owner confirms. Receipts show the EFRIS number only once the owner has recorded it.
- **Owners** sign in with a login the admin issued and see only their own properties, with five tabs: Overview, Units, Payments, Board and Requests. A waiting payment opens a gate that must be answered first; confirming lets the owner pick the room. The Board records walk-in tenants: something paid makes the room Reserved, paid in full makes it Occupied. Roommate changes and viewing requests arrive in Requests.
- **Admins** add properties (owners cannot), verify them once the LC1 letter and the property data consent agreement are received, and issue owner logins. The `owner-logins` Edge Function (`supabase/functions/owner-logins`) creates owner accounts and sets passwords with the service key on the server; passwords are shown once and never stored. The admin also manages the map pin, the agreement clauses and each floor's grid, where Fill adds only the missing rooms.
- **Photos and videos** live in the `listing-media` bucket under `<listing id>/`. Admins manage every gallery; owners manage the galleries of their own properties from their Overview (`supabase/migrations/20261110000000_owner_media.sql`). Either can add, remove or choose the cover photo, which is what the listing and the landing page show first.

## Images

Landing photos are in `public/img/`. The landing photos and the demo listing photos (`supabase/seeds/demo_photos.sql`) are freely licensed pictures of Kampala from Wikimedia Commons, credited in the landing page footer under "Photo credits".

## Accounts and roles

- **Super user** (role `super`): has everything an administrator has, and alone can add or remove administrators (enforced in the database by `protect_profile_role`; `is_admin()` is true for both `admin` and `super`). The `super` role can only be given or taken away from the database. Migrations: `supabase/migrations/20261114020000_super_role_value.sql` and `20261114020100_super_role.sql`. On the dashboard the super user's Onboarding page opens on **Admins**, where they can add a new admin (an account is created and the password is shown once), make an existing account an admin, take the role away (the person stays as a tenant), or give an admin a new password. The `owner-logins` Edge Function's `create_admin`, `admin_password` and `admin_list` actions refuse anyone but the super user.

## Search near a place

Explore suggests Uganda's regions, neighbourhoods around Kampala, universities, and every district, county, sub-county and parish or ward in the country. Picking one (or typing any place, or "places near me") finds it on OpenStreetMap and lists available places nearest first; fully occupied places are left out.

## Languages

English is the default. Kiswahili, Luganda, French and Kinyarwanda translate the interface from the `T` dictionary in `index.html`; a browser in another language is asked once on the first visit. Add a language by adding a column to `T` and an entry to `LANGS`.

## Installing and phone notifications

`public/sw.js` lets the app open instantly on repeat visits, work offline and show phone notifications. Every new row in `notifications` triggers the `send-push` Edge Function, which sends it to the person's subscribed devices. Its sending keys are generated on first use and stored in Supabase Vault. iPhones need Rentpply added to the Home Screen before notifications can be turned on.

## Places in Uganda (2024 census)

`public.places` holds all 13,520 places from the 2024 National Population and Housing Census (UBOS, sub-county profiles, Table 1): 147 districts and cities, 312 counties and divisions, 2,207 sub-counties and town councils, and 10,854 parishes and wards, each with its parent, region and population. Every row also names its district, county, sub-county and parish, in the spreadsheet's order (sort by `id`). Anyone can read it; only the database can change it. `search_places(q, max_results)` finds places by name. The census has no map positions, so the app finds a picked place on OpenStreetMap by name, falling back to its sub-county and then its district.

The data is in `supabase/seeds/ug_places.tsv`. To reload it, run `supabase/seeds/load_ug_places.sql` (it downloads the file from this repository).

## Screen addresses

Every screen has its own address: `/home`, `/explore`, `/roommates`, `/stay`, `/place/<id>` (with `/agreement`, `/payment` and `/status/<payment>` during a booking), `/owner/overview|units|payments|board|requests`, `/admin/onboard|units|property|listings|kpis`, and `/signin`, `/signup`, `/forgot`, `/reset` (`?for=owner` for the owner sign-in). `syncUrl()` in `index.html` keeps the address in step after every render, the browser's Back and Forward move between screens, and an open popup takes one history step so Back closes it first. A link to a screen that needs an account opens sign-in and then that screen; a screen the account may not see falls back to its first screen. The installed app opens on sign-in instead of the front page, and has shortcuts to Explore, My stay and Roommates. Cloudflare serves the app for every path (`not_found_handling: single-page-application`).

## Loading and speed

- The app is split so a phone downloads only what it needs: the main file (front page, tenant screens), the Supabase client (loaded alongside the page, not before it), the owner/admin dashboard `src/live-portal.js` (only for owners and admins) and the translations `src/i18n-text.js` (only after someone picks another language).
- Fonts are served from `public/fonts` (no Google Fonts request). Photos are shown at full quality: the front page uses the original photos in `public/img`, and listing photos are shown at the size they were added (1,280 pixels wide for the Wikimedia ones).
- Photos that owners and admins upload keep their quality: only camera photos over 2,560 pixels on the long side are scaled down to 2,560 pixels (WebP at 92%) before upload (`shrinkPhoto` in `src/live-portal.js`); smaller photos are uploaded as they are.
- The service worker opens the saved copy of the app if the network takes longer than 2.5 seconds, and saves fonts, images and built files for offline use.
- Start-up data comes in one trip. The database function `app_start()` returns the places (with photos, locations and terms), the signed-in person's account and, for tenants and students, their own records. `portal_start()` returns everything the owner/admin dashboard shows. Both run as the person asking, so the usual row level security applies (migration `20261115010000_one_trip_start.sql`). Before this, opening the app took 38 requests in 6 rounds. If either function fails, the app falls back to the old request-by-request loading (`startByParts`, `loadPortalByParts`).
- `app_start()` is requested as soon as the page starts, using the saved sign-in, without waiting for the Supabase client to download (`EARLY` in `index.html`).
- The last answer is kept on the phone (`localStorage` keys `rp_boot_<user id>` and `rp_boot_public`). A returning visitor sees their screen straight away while it is refreshed, and the screen is only redrawn if something changed. Signing out removes the signed-in copies.
- The session is checked once at start-up (Supabase's first auth event), and a renewed sign-in token does not reload anything.
