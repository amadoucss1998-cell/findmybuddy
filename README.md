# 🤝 Find My Buddy

**Connect with people in Liberia who share your interests — and discover or create activities to do together.**

Find My Buddy is a modern, mobile-first **Progressive Web App (PWA)**. It installs to a phone's home screen, works offline, and needs **no build step** — just open `index.html` or deploy the folder anywhere.

Built for Liberia 🇱🇷: local counties, Liberian Dollar (L$) pricing, and Mobile Money (MTN MoMo / Orange Money) checkout points.

---

## ✨ Features

| Area | What it does |
|------|--------------|
| **Onboarding** | Quick profile setup — name, county, interests, bio |
| **Discover** | People matched to you by shared interests + county, with a live match score |
| **Connect & Chat** | Connect with buddies and message them (with simulated replies) |
| **Activities** | Browse upcoming activities ranked "for you", filter by category |
| **Create** | Host your own activity — set venue, date, capacity, price, and promote it |
| **Profile** | Your stats, interests, hosted & joined activities |
| **Buddy Plus** | Premium tier (monetization) — unlimited connects, boost, verified badge |
| **PWA** | Installable, offline-capable, app-like on Android & iPhone |
| **Dark mode** | Full light/dark theme, respects the toggle |

All data is stored locally in the browser (`localStorage`), so the demo is fully usable immediately with seeded Liberian buddies and activities.

---

## 🚀 Run it

### Locally (no tools needed)
```bash
# any static server works, e.g.:
python3 -m http.server 8080
# then open http://localhost:8080
```

### Deploy to Vercel
```bash
npm i -g vercel
vercel        # from this folder
```
`vercel.json` is already configured for static hosting with correct headers for the service worker and manifest. It also deploys as-is via the Vercel dashboard ("Import Project" → this repo → deploy, no framework preset needed).

You can host it just as easily on Netlify, GitHub Pages, Cloudflare Pages, or Firebase Hosting — it's plain static files.

---

## 📁 Project structure

```
findmybuddy/
├── index.html                 # App shell
├── manifest.webmanifest       # PWA manifest (installable)
├── sw.js                      # Service worker (offline app shell)
├── vercel.json                # Static hosting config
└── assets/
    ├── css/styles.css         # Design system (light/dark)
    ├── js/
    │   ├── data.js            # Seed data (counties, interests, people, activities)
    │   ├── store.js           # State, persistence, matching & messaging logic
    │   └── app.js             # Router + all views/screens
    └── icons/                 # App icons (+ generator script)
```

No framework, no dependencies — vanilla JS kept intentionally simple so it's easy to extend.

---

## 💰 Path to revenue

The app already surfaces the monetization model in the UI. To turn it into a real business, wire these up:

1. **Buddy Plus subscription** — L$500/mo premium (the upgrade flow is built; connect it to MTN MoMo / Orange Money).
2. **Promoted activities** — L$250 boost to the top of Discover & Activities (toggle is in the Create screen).
3. **Paid event tickets** — activities can already be priced in L$; collect via Mobile Money and take a small service fee.
4. **Local business & venue partnerships** — featured activities and sponsored categories.

### To scale beyond the demo
- Replace `localStorage` with a real backend (auth, database, real-time chat). A companion **Express + Vercel** service is a natural fit.
- Integrate a Mobile Money payment provider for subscriptions, ticketing, and promotions.
- Add push notifications (the PWA + service worker foundation is already in place).

---

## 🛠 Regenerating icons

```bash
node assets/icons/gen-icons.mjs   # regenerates icon-192.png & icon-512.png
```

---

Made with ❤️ for connecting people across Liberia.
