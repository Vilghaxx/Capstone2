# Dental System

A full-stack dental practice management application: patient records, an interactive 32-tooth dental chart, appointment scheduling, treatment history, and billing. Web app only — patients use the same responsive web app, not a separate mobile application.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router, client-side hash routing) |
| Backend API | Express.js (port 3001) |
| Database | Firebase Realtime Database (RTDB, via firebase-admin) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand (auth, navigation), TanStack React Query (server state) |
| Forms | React Hook Form + Zod |
| Auth | Google OAuth 2.0 (sign-in) + JWT (session, 7-day expiry) |
| Animations | Framer Motion |

## Quick Start (Development)

```bash
# 1. Install dependencies
bun install
# or: npm install

# 2. Create .env (there is no .env.example in the repo)
cp .env .env.example  # backup the default first, or create manually:
```

```env
FIREBASE_KEY_PATH="capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json"
FIREBASE_DATABASE_URL="https://capstone-f6c32-default-rtdb.firebaseio.com"
JWT_SECRET="your-long-random-secret-here"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
```

- `FIREBASE_KEY_PATH` — path to a Firebase service-account JSON. Defaults to `capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json` in the project root.
- `FIREBASE_DATABASE_URL` — RTDB URL. Defaults to `https://capstone-f6c32-default-rtdb.firebaseio.com`.
- `JWT_SECRET` — token signing secret. Defaults to a dev secret; change in production.
- `GOOGLE_CLIENT_ID` — OAuth 2.0 client ID used to verify Google sign-in credentials.

```bash
# 3. Seed the database (optional but recommended)
npm run seed

# 4. Start both servers (Express API + Next.js)
npm run dev:all
```

The app runs on `http://localhost:3000`; the Express API on `http://localhost:3001`. Next.js rewrites `/api/*` to the API via `next.config.mjs`.

## Authentication

All users sign in with Google OAuth (`POST /api/auth/google`); there is no username/password registration. Roles are assigned automatically by registration order (total user count at first sign-in):

| Existing users | New user role |
|----------------|---------------|
| 0 | dentist |
| 1 | cashier |
| 2+ | patient |

Patients are provisioned automatically on first sign-in: a `patient` record is created, linked via `patientRef`, and 32 healthy tooth records are generated. Roles are managed directly in the `users` node of the database.

## NPM Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start Next.js dev server (port 3000) |
| `dev:server` | Start Express API only (port 3001) |
| `dev:all` | Start Express API + Next.js dev server |
| `build` | Production build (Next.js) |
| `start` | Start production Next.js server (port 3000) |
| `start:server` | Start production Express API |
| `lint` | Run ESLint |
| `wipe` | Wipe all Firebase RTDB data (destructive; requires `--yes` flag or `WIPE_CONFIRM=yes`) |
| `seed` | Seed 28 patients, teeth, ~1 month of appointments, treatments |
| `seed:busy` | Same seed with a larger Node heap (`--max-old-space-size=4096`) |

## User Roles & Permissions

| Feature | Dentist | Cashier | Patient |
|---------|---------|---------|---------|
| Sign in (Google OAuth) | ✅ | ✅ | ✅ |
| Manage patients (CRUD) | ✅ | ✅ | — |
| View patient profile + dental chart | ✅ | ✅ | — |
| Edit tooth status (chart) | ✅ | — | — |
| Record / edit treatments | ✅ | — | — |
| Manage appointments (create, update status) | ✅ | ✅ | — |
| Delete appointments (UI) | ✅ | — | — |
| Approve pending appointment requests | ✅ | ✅ | — |
| Billing: view, record payments | ✅ | ✅ | — |
| Book own appointment | — | — | ✅ |
| Manage own appointments / profile | — | — | ✅ |

Notes:

- Patients never see the staff views (Patients, Appointments, Billing, Patient Profile); staff never see patient views (Book, My Appointments, My Profile). Enforced both in the UI (`src/app/page.jsx`, `AppShell.jsx`) and by the API (`requireRole`).
- The API permits cashier/patient deletion of appointments, but the UI exposes delete only to dentists.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Tailwind 4 + theme tokens
│   ├── layout.jsx         # Root layout + ThemeProvider
│   └── page.jsx           # Client-side hash router + role gating
├── components/
│   ├── common/            # OralCavityChart, ToothIcon, StatusBadge, ConfirmDialog, …
│   ├── layout/            # AppShell (role-filtered sidebar + mobile nav)
│   ├── ui/                # shadcn/ui components
│   └── views/             # Page views (login, dashboard, patients, patient-profile,
│   │                       #  appointments, billing, book, my-appointments, my-profile)
│       ├── appointments/  # List / Schedule / Requests tabs + New Appointment dialog
│       ├── dashboard/     # Role-specific dashboards (dentist, cashier, patient)
│       └── patient-profile/ # Profile card, tooth modal, treatment history
├── hooks/                 # React Query hooks (use-patients, use-appointments, …)
└── lib/                   # api client, auth-store, nav (hash router), constants,
    └── schemas/           # Zod validation schemas (mirror of server schemas)

server/                    # Express API (CommonJS)
├── routes/                # auth, patients, teeth, treatments, appointments, billing
├── db.js                  # Firebase Admin setup + Prisma-like collection wrapper ($transaction, etc.)
├── auth.js                # JWT sign/verify
├── middleware.js          # authenticate, requireRole, withErrors
├── validate.js            # Zod schemas
├── constants.js           # ROLES, TOOTH_STATUSES, APPOINTMENT_STATUSES, TOTAL_TEETH
└── index.js               # Express entrypoint

scripts/
├── seed.ts                # Database seeder (faker data, PH locale)
└── wipe.ts                # Destructive wipe (requires --yes / WIPE_CONFIRM=yes)
```

## Production Deployment

```bash
bun install
npm run build
npm run start          # Next.js on port 3000
npm run start:server   # Express API on port 3001
```

`next.config.mjs` sets `output: "standalone"`, so the build produces a self-contained `.next/standalone` bundle that can be copied to a server with Node.js. The included `Caddyfile` reverse-proxies port 3000 (and can proxy an arbitrary port via the `?port=` query) behind Caddy.

## License

Private — all rights reserved.
