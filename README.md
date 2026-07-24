# UUSD Network (Telegram Mini App)

Vite + React + TypeScript + Firebase. In-app wallet, rewards, referrals, admin panel, PIN-protected sends.

## Quick start

```bash
npm install
npm run dev
```

## Firebase

1. Put your web config in `firebase-applet-config.json` (placeholders are there).
2. Create Firestore; deploy `firestore.rules`.
3. See **AI_GUIDE.md** for collections and safe edit zones.

## Deploy (Vercel)

- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- `vercel.json` already has SPA rewrites.

## Admin

- URL: `/admin`
- Demo login: `admin` / `uusdadmin2026`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | `tsc --noEmit` |
