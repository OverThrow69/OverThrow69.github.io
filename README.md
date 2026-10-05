# Daily Reminder

A simple personal reminder app built with React, Vite, JavaScript, CSS, and localStorage.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Features

- Today's reminders dashboard
- Add and edit reminder form
- Delete reminders
- Mark reminders complete
- Upcoming reminders grouped by date
- Settings screen with clear-all confirmation
- localStorage persistence
- Mobile-first responsive layout

## Cloud sync

The local phone link only works on the same Wi-Fi as the desktop app. For travel/mobile-data use, deploy the sync worker in `cloud-sync/` and paste its public HTTPS URL into **Settings > Cloud sync**.

The same sync key must be used on the PC and phone. After the hosted web app is opened on the phone, save the same Cloud sync URL and key there so both devices share the same reminder data.

See `cloud-sync/README.md` for the Cloudflare Worker deploy steps.

## Publish free on GitHub Pages

This project includes a GitHub Actions workflow for free GitHub Pages hosting. After pushing it to a public GitHub repo called `morries-reminder`, GitHub will build and publish the app at:

```text
https://overthrow69.github.io/morries-reminder/
```

Google can index that public URL after it is live. The local `192.168...` test link cannot be indexed by Google.
