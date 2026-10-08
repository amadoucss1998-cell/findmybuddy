# LoneStar Tasks 🇱🇷

A TaskRabbit / Taskers–style marketplace for Liberia, built as a web app that looks and feels like a native mobile app.

Book trusted local Taskers in Monrovia and across Liberia for house cleaning, generator repair, moving, deliveries, solar installs, braiding, tailoring, tutoring and more. Prices are shown in USD with an approximate LRD conversion, and checkout supports Orange Money, MTN MoMo, card or cash.

## Stack

- **React 19 + Vite 7**
- **Tailwind CSS v4** for styling, with light and dark themes
- **three.js** via `@react-three/fiber` + `@react-three/drei` for the 3D scenes: the extruded Lone Star, toolbox, map pin, coin stack, success check and a pointer-parallax desktop backdrop
- **Framer Motion** for page transitions, shared-layout animations, drag gestures (bottom sheets, swipe-to-accept jobs, slide-to-book, onboarding swipes), springs, confetti and a 3D tilt wallet card
- **Supabase** (Postgres, phone auth, realtime) for data, with **Zustand** for app state and a mobile-style navigation stack
- **lucide-react** icons

## Features

**Client side**
- Animated splash, swipeable 3D onboarding, phone sign-in with a 6-digit SMS code (+231)
- Home: location picker for Liberian communities, search, promo carousel, 22 service categories, top Taskers nearby
- A 4-step task builder (location, size, details, date/time), then a Tasker list you can sort and filter (top rated, price, nearest, elite, online)
- Tasker profiles with a parallax header, animated stats, per-skill rates, and a rating breakdown with reviews
- Checkout with payment method choice, wallet credit, promo code `LIB5`, a fee breakdown and slide-to-book
- A confirmation screen with a 3D check and confetti
- Live task tracking on a stylised Monrovia map with a status timeline, plus rating and tipping
- In-app chat with typing indicators and simulated replies, an inbox and notifications
- A wallet with a 3D tilt card and top-ups, and account settings including dark mode

**Tasker mode** (switch from Account)
- Earnings dashboard with an animated chart, an online/offline toggle and cash out
- Job requests you swipe right to accept or left to pass, plus a schedule of accepted jobs

On desktop the app sits in a phone frame over a 3D backdrop. On a phone it runs full screen, and you can install it as a PWA.

## Backend: Supabase

The app talks to Supabase for phone sign-in, the Postgres database, row-level security and realtime chat, bookings and notifications. If no Supabase keys are set, it falls back to a **local demo backend** that keeps data in the browser and follows the same rules.

### Set up your Supabase project (one time)

1. **Create the database.** Open Supabase → **SQL Editor**, paste the contents of [`supabase/setup.sql`](supabase/setup.sql) and click **Run**. This creates the tables, security rules and booking/wallet functions, and seeds the 22 categories, 36 Taskers and promo codes. If you use the Supabase CLI, `supabase db push` applies the same files from `supabase/migrations/`.
2. **Turn on phone sign-in.** Go to **Authentication → Sign In / Providers → Phone**, enable it and connect an SMS provider such as Twilio, MessageBird or Vonage. Check that the provider delivers to Liberian numbers (+231). While testing, you can add **test phone numbers with fixed codes** on the same page, so no SMS is sent.
3. **Keys.** The project URL and **anon** key are in `.env.production`, which production builds use. The anon key is meant to be public, because row-level security protects the data. For local development, copy `.env.example` to `.env.local`. Never put the `service_role` key in this app.

### How it's secured

- Every table has row-level security. Users can only read their own profile, bookings, payments, messages, notifications and jobs. Taskers, categories and reviews are public.
- The client never writes prices, wallet balances or booking statuses. Those go through Postgres functions (`create_booking`, `cancel_booking`, `review_booking`, `topup_wallet`, `respond_to_job`, `cash_out` and others) that recalculate everything on the server.
- New sign-ups get a profile and $25 welcome credit automatically.

### Demo switches (table `app_settings`)

| key | default | meaning |
|---|---|---|
| `demo` | `true` | Seeded Taskers auto-reply in chat, and clients can tap "Simulate next status". Set it to `false` for real launch. |
| `payments_mode` | `sandbox` | Orange Money, MTN MoMo and card payments are marked paid instantly. Real mobile-money collection needs merchant accounts and a webhook (Edge Function), which isn't built yet. In `live` mode, payments stay `pending`. |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (uses .env.local if present, else the demo backend)
npm run build      # production build in dist/
npm run test:db    # runs the Supabase migrations in embedded Postgres (PGlite) and tests RLS + functions
npm run gen:seed   # regenerate the seed migration + supabase/setup.sql after editing src/lib/data.js
```

## Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this there).
2. In Vercel, click **Add New → Project** and import the repo. Vercel reads `vercel.json`: framework Vite, `npm ci`, `npm run build`, output `dist/`. You don't need to change any settings.
3. Click **Deploy**. Supabase settings come from `.env.production`. To point at a different project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project → Settings → Environment Variables; those override the file.
4. Before real users sign up, finish the Supabase setup above: run `setup.sql`, turn on Phone auth with an SMS provider, and set `demo` to `false`.

`vercel.json` also sets long-term caching for hashed assets, basic security headers, and a fallback to `index.html` so deep links work.

Deploy from the CLI instead: `npm i -g vercel && vercel --prod`.
