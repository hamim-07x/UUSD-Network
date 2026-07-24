# UUSD Network — AI / Developer Guide

> **#AI_DO_NOT_BREAK** — Read this before changing code.
> This is a Telegram Mini App (Vite + React 19 + TypeScript + Firebase Firestore).

## Product (do not change without explicit request)

- **Main app UI design** must stay the same (colors, layout, pages).
- Admin panel may be improved; user-facing Wallet/Rewards look should not be redesigned casually.
- On-chain real deposit/withdraw is **NOT** in this build (in-app ledger only).

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite 6, React 19, TypeScript, Tailwind v4, Framer Motion |
| Router | react-router-dom |
| Telegram | `@twa-dev/sdk` |
| DB | Firebase Firestore |
| Optional backend | `functions/` Cloud Functions (Telegram/Twitter verify) |
| Hosting demo | Vercel (`vercel.json` SPA rewrites) |

## Firebase connect (AI Studio)

1. Replace placeholders in **`firebase-applet-config.json`** with the real Firebase web config.
2. `src/lib/firebase.ts` imports that JSON — **do not hardcode secrets in components**.
3. Enable **Firestore**; deploy **`firestore.rules`**.
4. Collections used: `users`, `wallets`, `activities`, `tasks`, `events`, `completed_tasks`, `referrals`, `user_settings`, `user_security`, `settings`.

## Folder map

```
src/
  App.tsx                 # routes only
  main.tsx                # providers
  components/layout/      # AppLayout (wallet gate), BottomNav, LoadingScreen
  components/ui/          # PinModal, ErrorBoundary, Skeleton
  hooks/                  # useTelegramUser, useWallet
  lib/                    # firebase, db, pin, verifyTask, SettingsContext
  pages/                  # screens (Wallet, Rewards, AdminPanel, ...)
functions/                # optional API verification
```

## Critical flows (#AI_SAFE zones)

1. **Wallet gate** — `AppLayout.tsx`: if no Firestore wallet, block all pages until create (~12s).
2. **PIN** — `lib/pin.ts` + `PinModal.tsx` + `Withdraw.tsx`: wrong PIN must **never** call transfer.
3. **Transfer** — `lib/db.ts` → `transferFunds` uses `runTransaction` only.
4. **Tasks** — `Rewards.tsx`: Start → 5s countdown → Verify → Claim; referral counts from Firestore.
5. **Admin** — `/admin` login is client-side demo (`admin` / `uusdadmin2026`); tighten before production.

## Do not

- Do not restore wallet **only** from localStorage if Firestore has no wallet.
- Do not put Telegram bot token or Twitter token in frontend bundle logic beyond Admin→Firestore settings (prefer Functions secrets in production).
- Do not remove `ErrorBoundary` around the app.
- Do not change route paths without updating `App.tsx` and BottomNav.

## Scale notes (1M+ users later)

- Move balance mutations / task claim / verify to Cloud Functions.
- Tighten Firestore rules (owner-only writes).
- Add rate limits, indexed queries, pagination (admin already limits 1000).
- Replace client admin password with real auth.

## Admin password (demo)

- Username: `admin`
- Password: `uusdadmin2026`
