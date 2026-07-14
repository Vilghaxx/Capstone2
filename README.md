# Dental System

A full-stack dental practice management application built with Next.js 16, TypeScript, Prisma, and Tailwind CSS. Supports three user roles — dentist, cashier, and patient — with patient records, an interactive 32-tooth dental chart, appointments, treatments, and billing.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: SQLite (development) / PostgreSQL (production) via Prisma ORM
- **Styling**: Tailwind CSS 4 + shadcn/ui component library
- **State**: Zustand (auth), TanStack React Query (server state)
- **Forms**: React Hook Form + Zod validation
- **Auth**: JWT + bcrypt password hashing
- **Animations**: Framer Motion

## Quick Start (Development)

```bash
# 1. Install dependencies
bun install

# 2. Copy environment config
cp .env.example .env
# Edit .env — set JWT_SECRET to a random string (openssl rand -base64 32)

# 3. Set up the database + seed initial staff accounts
bun run setup
# This runs: prisma db push && bun prisma/seed.ts

# 4. Start the dev server
bun run dev
```

The app runs on `http://localhost:3000`.

## Default Staff Credentials

Created by `bun run db:seed` (change these after first login in production):

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Dentist | `dentist` | `dentist123`|
| Cashier | `cashier` | `cashier123`|

Override during seeding with environment variables:
```bash
SEED_DENTIST_USERNAME=dr.smith SEED_DENTIST_PASSWORD=securepass bun run db:seed
```

Patients can self-register via the Register page.

## Production Deployment

### 1. Environment Variables

Set these in your production environment:

```env
DATABASE_URL="postgresql://user:password@host:5432/dental_system?schema=public"
JWT_SECRET="your-long-random-secret-here"
NODE_ENV="production"
```

### 2. Database Setup (PostgreSQL)

For production, switch from SQLite to PostgreSQL:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  # was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Run migrations:
   ```bash
   bun run db:push
   bun run db:seed
   ```

### 3. Build & Start

```bash
bun install
bun run build
bun run start   # starts next start on port 3000
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set the environment variables in the Vercel dashboard. Note: SQLite won't work on Vercel (serverless, no persistent filesystem) — use PostgreSQL (e.g. Vercel Postgres, Supabase, or Neon).

### Deploy with Docker

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start Next.js dev server (port 3000) |
| `build` | Production build |
| `start` | Start production server (port 3000) |
| `lint` | Run ESLint |
| `setup` | Push DB schema + seed staff accounts |
| `db:push` | Push Prisma schema to database |
| `db:generate` | Generate Prisma client |
| `db:migrate` | Create + apply a migration |
| `db:seed` | Seed initial dentist + cashier accounts |
| `db:reset` | Reset database (destructive) |

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
│   ├── api/               # API routes (auth, patients, teeth, treatments, appointments, billing)
│   ├── layout.tsx         # Root layout + ThemeProvider
│   └── page.tsx           # Client-side router (hash-based)
├── components/
│   ├── common/            # OralCavityChart, ToothIcon, ThemeToggle, ConfirmDialog, etc.
│   ├── layout/            # AppShell (sidebar + mobile nav)
│   ├── ui/                # shadcn/ui component library
│   └── views/             # Page views (dashboard, patients, appointments, billing, auth)
│       ├── appointments/  # Modular appointment sub-components
│       ├── dashboard/     # Role-specific dashboards
│       └── patient-profile/ # Patient profile sub-components
├── hooks/                 # React Query hooks (use-patients, use-appointments, etc.)
├── lib/                   # Shared utilities (auth, db, api, constants, types, schemas)
│   └── schemas/           # Zod validation schemas
└── prisma/
    ├── schema.prisma      # Database schema
    └── seed.ts            # Staff account seeder
```

## License

Private — all rights reserved.
