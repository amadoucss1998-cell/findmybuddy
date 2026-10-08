# LoneStar Tasks 🇱🇷

A TaskRabbit / Taskers–style marketplace for Liberia, built as a web app that looks and feels like a native mobile app.

Book trusted local Taskers in Monrovia and across Liberia for house cleaning, generator repair, moving, deliveries, solar installs, braiding, tailoring, tutoring and more. Prices are shown in USD with an approximate LRD conversion, and checkout supports Orange Money, MTN MoMo, card or cash.

## Stack

- **React 19 + Vite 7**
- **Tailwind CSS v4** for styling, with light and dark themes
- **three.js** via `@react-three/fiber` + `@react-three/drei` for the 3D scenes: the extruded Lone Star, toolbox, map pin, coin stack, success check and a pointer-parallax desktop backdrop
- **Framer Motion** for page transitions, shared-layout animations, drag gestures (bottom sheets, swipe-to-accept jobs, slide-to-book, onboarding swipes), springs, confetti and a 3D tilt wallet card
- **Zustand** (persisted to localStorage) for state and a mobile-style navigation stack
- **lucide-react** icons

## Features

**Client side**
- Animated splash, swipeable 3D onboarding, phone + OTP sign-in (+231). This is a demo, so any 4-digit code works.
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

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Deploys to Vercel as-is (`vercel.json` is included).

All data is mock and stays on the device, so there's no backend yet.
