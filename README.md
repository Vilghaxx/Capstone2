# Dental System

A full-stack dental practice management application built with Next.js 16 + Express.js backend, JavaScript, Firebase RTDB, and Tailwind CSS. Supports three user roles — dentist, cashier, and patient — with patient records, an interactive 32-tooth dental chart, appointments, treatments, and billing.

## Tech Stack

- **Frontend**: Next.js 16 (App Router, client-side hash routing)
- **Backend API**: Express.js (port 3001)
- **Database**: Firebase Realtime Database (RTDB)
- **Styling**: Tailwind CSS 4 + shadcn/ui component library
- **State**: Zustand (auth), TanStack React Query (server state)
- **Forms**: React Hook Form + Zod validation
- **Auth**: JWT + Google OAuth sign-in
- **Animations**: Framer Motion

## Quick Start (Development)

```bash
# 1. Install dependencies
bun install
# or: npm install

# 2. Create .env
cp .env.example .env
```

If you don't have `.env.example`, create `.env` manually:

```env
FIREBASE_KEY_PATH="capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json"
FIREBASE_DATABASE_URL="https://<your-project>-default-rtdb.firebaseio.com"
JWT_SECRET="your-long-random-secret-here"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
```

`FIREBASE_KEY_PATH` is a service-account JSON downloaded from the Firebase console. `GOOGLE_CLIENT_ID` comes from a Google Cloud OAuth 2.0 client.

```bash
# 3. Seed the database (optional but recommended)
npm run seed

# 4. Start both servers (Express API + Next.js)
npm run dev:all
```

The app runs on `http://localhost:3000`, with the Express API on `http://localhost:3001` (Next.js rewrites `/api/*` to it).

## Authentication

Users sign in with Google OAuth. The first Google sign-in after seeding is granted the **dentist** role; later sign-ins default to **patient**. Role changes are managed in the database (`users` node).

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
| `wipe` | Wipe all Firebase RTDB data (destructive, requires confirm) |
| `seed` | Seed patients, teeth, appointments, treatments |
| `seed:busy` | Seed with more heap (large datasets) |

## User Roles & Permissions

| Feature | Dentist | Cashier | Patient |
|---------|---------|---------|---------|
| Login | ✅ | ✅ | ✅ |
| Register | — | — | ✅ |
| Manage patients (CRUD) | ✅ | ✅ | — |
| View dental chart | ✅ | ✅ | — |
| Edit tooth status / treatments | ✅ | — | — |
| Manage appointments | ✅ | ✅ | — |
| Delete appointments | ✅ | — | — |
| View/record billing | ✅ | ✅ | — |
| Book own appointment | — | — | ✅ |
| View own appointments | — | — | ✅ |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Tailwind 4 + theme tokens
│   ├── layout.jsx         # Root layout + ThemeProvider
│   └── page.jsx           # Client-side router (hash-based)
├── components/
│   ├── common/            # OralCavityChart, ToothIcon, ThemeToggle, ConfirmDialog, etc.
│   ├── layout/            # AppShell (sidebar + mobile nav)
│   ├── ui/                # shadcn/ui component library
│   └── views/             # Page views (dashboard, patients, appointments, billing, auth)
│       ├── appointments/  # Modular appointment sub-components
│       ├── dashboard/     # Role-specific dashboards
│       └── patient-profile/ # Patient profile sub-components
├── hooks/                 # React Query hooks (use-patients, use-appointments, etc.)
└── lib/                   # Shared utilities (api, auth-store, constants, schemas)
    └── schemas/           # Zod validation schemas

server/                    # Express API
├── routes/                # auth, patients, teeth, treatments, appointments, billing
├── db.js                  # Firebase Admin SDK setup
├── auth.js                # JWT auth middleware
├── validate.js            # Validation helpers
└── index.js               # Express entrypoint

scripts/
├── seed.ts                # Database seeder (faker data)
└── wipe.ts                # Destructive wipe (requires confirm)
```

## Production Deployment

```bash
bun install
npm run build
npm run start      # Next.js on port 3000
npm run start:server  # Express API on port 3001
```

`next.config.mjs` is set to `output: "standalone"`, so the build produces a self-contained `.next/standalone` bundle you can copy to a server with Node.js.

## License

Private — all rights reserved.
