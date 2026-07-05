# Radiograph — Work Log

This file tracks the work done by all agents on the Radiograph dental practice
management system.

---
Task ID: 1
Agent: main (orchestrator)
Task: Build foundation — Prisma schema, lib files, zod schemas, db push, seed utility

Work Log:
- Installed `bcryptjs` and `jsonwebtoken` (+ types).
- Wrote `prisma/schema.prisma` with models: User, Patient, Tooth, Treatment, Appointment (SQLite). Used String for enums (SQLite limitation), `@@unique` + `@@index` for performance.
- Ran `bun run db:push` — database is in sync, Prisma client generated.
- Wrote `src/lib/constants.ts` — ROLES, TOOTH_STATUSES, APPOINTMENT_TYPES/STATUSES, PAYMENT_METHODS, PAGINATION_DEFAULTS, TOTAL_TEETH, plus UI meta maps (TOOTH_STATUS_META, APPOINTMENT_STATUS_META, etc.).
- Wrote `src/lib/auth.ts` — bcrypt hash/compare, jwt sign/verify, getUserFromRequest, requireRole helpers.
- Wrote `src/lib/api-response.ts` — ok/fail/unauthorized/forbidden/notFound/handleZodError/withErrors helpers for route handlers.
- Wrote `src/lib/seed.ts` — seedDatabase() creates demo dentist + cashier, 4 sample patients each with 32 teeth, and 2 sample appointments. Idempotent.
- Wrote zod schemas in `src/lib/schemas/`: auth-schema, patient-schema, appointment-schema, treatment-schema, billing-schema.
- Created `src/lib/schemas/` and `src/lib/services/` directories.

Stage Summary:
- Database ready (SQLite at db/custom.db).
- All shared backend lib code is in `src/lib/`.
- Demo credentials after seed: dentist/dentist123, cashier/cashier123.
- API routes should import helpers from `@/lib/auth`, `@/lib/api-response`, `@/lib/constants`, `@/lib/db`.
- Zod schemas live in `@/lib/schemas/*`.
- IMPORTANT for all subagents: this is a Next.js 16 App Router project. API routes go in `src/app/api/.../route.ts`. Only the `/` page route is user-visible; all "pages" are client-side views switched via state inside `src/app/page.tsx`. Use Prisma via `import { db } from "@/lib/db"`. Use Tailwind/shadcn-ui components from `@/components/ui/*`. Do NOT use indigo/blue as primary brand colors.

---
Task ID: 2-a
Agent: auth-api-builder
Task: Build auth API routes

Work Log:
- Read foundation (schema, lib/auth, lib/api-response, lib/schemas/auth-schema, lib/seed, constants) to confirm helper signatures.
- Created `src/app/api/auth/login/route.ts` — POST handler validating with `loginFormSchema`, looking up user by username, returning 401 on missing user or password mismatch, signing JWT with { sub, username, role, name, patientRef } and returning { token, user }.
- Created `src/app/api/auth/register/route.ts` — POST handler validating with `registerFormSchema`, rejecting taken usernames with 409, hashing password, creating User (role="patient"), creating a linked Patient record (with provided name/phone/email/dateOfBirth/address), linking user.patientRef = patient.id, creating 32 default Tooth records (toothNumber 1..32, status="healthy", notes=null), then signing + returning JWT.
- Created `src/app/api/auth/me/route.ts` — GET handler (NextRequest) using `getUserFromRequest`, returning 401 when no/invalid token, otherwise fetching fresh user from db and returning the public user shape.
- Created `src/app/api/auth/seed/route.ts` — POST handler that calls `seedDatabase()` and returns { message: "Seed completed", results }; added a comment noting it must be disabled/gated in production.
- All four handlers wrapped with `withErrors()`, all zod validation uses `.safeParse()` + `handleZodError()`, no files modified outside `src/app/api/auth/`.
- Ran `bun run lint` — clean, no errors.

Stage Summary:
- Four auth API routes implemented under `src/app/api/auth/{login,register,me,seed}/route.ts`.
- Login + register both return `{ token, user: { id, username, role, name, patientRef } }`.
- Registration auto-provisions a Patient + 32 healthy Teeth so new patient users can immediately use tooth chart features.
- /me re-fetches the user from db so downstream callers always see fresh name/patientRef.
- Seed endpoint is dev-only and flagged for production gating.
- Ready for frontend + downstream API routes (patients, appointments, treatments, billing) to consume these auth endpoints via the returned JWT.

---
Task ID: 2-b
Agent: patients-api-builder
Task: Build patients API routes

Work Log:
- Read foundation worklog and existing lib files (auth, api-response, constants, patient-schema, prisma schema) to align with established patterns.
- Created `src/app/api/patients/route.ts`:
  - GET: any authenticated user. Parses `search`/`page`/`limit` from query string with defaults from PAGINATION_DEFAULTS (page=1, limit=50, max=200). Builds an OR across name/email/phone using plain `contains` (SQLite is case-insensitive for ASCII; avoids unsupported `mode: "insensitive"`). Runs count + findMany in parallel, sorts by createdAt desc, returns `{ data, total, page, limit, totalPages }`.
  - POST: dentist only. Validates body with patientFormSchema (safeParse + handleZodError), creates Patient, then seeds 32 default Teeth (toothNumber 1..32, status "healthy", notes null) via `db.tooth.createMany`. Returns created patient with 201.
- Created `src/app/api/patients/[id]/route.ts`:
  - GET: any authenticated user, 404 if not found.
  - PUT: dentist only. Validates with patientFormSchema, sets updatedAt explicitly, returns updated patient.
  - DELETE: dentist only. Cascades deleteMany on Tooth, Treatment, Appointment for the patient, then deletes the patient. Returns `{ success: true }`.
- All handlers wrapped with `withErrors()`. Auth uses `getUserFromRequest(req)` + `requireRole(user, ROLES.DENTIST)` returning `unauthorized()` / `forbidden()` on failure. Used `NextRequest` from `next/server` and async `params` (Next.js 16 signature).
- Ran `bun run lint` — passed with zero errors.

Stage Summary:
- Patients CRUD API is live at `/api/patients` (GET list, POST create) and `/api/patients/:id` (GET, PUT, DELETE).
- POST auto-seeds the 32-tooth chart so newly created patients are immediately ready for odontogram interactions.
- DELETE performs a safe manual cascade across teeth, treatments, and appointments before removing the patient.
- All responses use the shared `ok/fail/unauthorized/forbidden/notFound/handleZodError` helpers for consistent JSON shape. No files outside `src/app/api/patients/` were modified.

---
Task ID: 2-e
Agent: appointments-api-builder
Task: Build appointments API routes

Work Log:
- Read worklog.md and inspected existing lib helpers (auth, api-response, constants, db) and the appointment-schema, plus sibling routes (patients, teeth) to follow established conventions.
- Created `src/app/api/appointments/route.ts`:
  - GET: authenticated (dentist/cashier/patient). Patients filtered to their own patientRef. Optional `status` and `date` (YYYY-MM-DD) query filters; `date` filters by a UTC day range (gte startOfDay, lt startOfNextDay). Ordered by date asc. Returns the array directly.
  - POST: authenticated. Validates with appointmentFormSchema. Patients: patientId forced to user.patientRef, status forced to "pending", createdBy = user.sub. Staff: uses body patientId, status defaults to "scheduled" unless body specifies otherwise, createdBy = user.sub. Date string parsed to a Date object for storage. Returns the created appointment (201).
- Created `src/app/api/appointments/[id]/route.ts`:
  - GET: authenticated. Returns 404 if not found, 403 if patient tries to view another patient's appointment.
  - PUT: staff only (dentist OR cashier); patients get 403. Uses an inline permissive Zod schema accepting { status?, notes?, time?, type?, date? }. Only provided fields are written. `date` is parsed to Date before storage. Returns updated appointment (or existing if no fields provided).
  - DELETE: dentist only. Returns { success: true }.
- All handlers wrapped in `withErrors()`, use `getUserFromRequest`, `requireRole`, and `handleZodError`. Next.js 16 params Promise pattern used (`const { id } = await params;`).
- Ran `bun run lint` — no errors in the new files. Ran `bunx tsc --noEmit` — only pre-existing errors in `examples/` and `skills/` directories, none in the new appointments routes.

Stage Summary:
- Two new route files created under `src/app/api/appointments/`: `route.ts` (collection GET/POST) and `[id]/route.ts` (item GET/PUT/DELETE).
- Role-aware access control: patients are sandboxed to their own appointments for read/create; updates are staff-only; deletes are dentist-only.
- Patients creating appointments always land in "pending" status; staff-created appointments default to "scheduled".
- Lint clean. No files outside `src/app/api/appointments/` modified.

---
Task ID: 2-c
Agent: teeth-api-builder
Task: Build teeth API routes

Work Log:
- Read worklog and reviewed lib helpers (`@/lib/db`, `@/lib/auth`, `@/lib/api-response`, `@/lib/schemas/billing-schema`, `@/lib/constants`) plus the Prisma `Tooth` model (has `@@unique([patientId, toothNumber])`, so the compound unique key is `patientId_toothNumber`).
- Created `src/app/api/teeth/[patientId]/route.ts` with a GET handler wrapped in `withErrors()` that authenticates via `getUserFromRequest` + `requireRole` (any logged-in role), awaits the `params` promise, then returns all teeth for the patient ordered by `toothNumber` asc via `db.tooth.findMany` -> `ok(teeth)`.
- Created `src/app/api/teeth/[patientId]/[toothNumber]/route.ts`:
  - GET (authenticated): coerces `toothNumber` to Number (404 on NaN), uses `db.tooth.findUnique` with `patientId_toothNumber` compound where, 404 if missing, else `ok(tooth)`.
  - PUT (dentist only): authenticates, returns `unauthorized()` if no user, then `forbidden()` if role check fails. Parses body with `toothUpdateSchema.safeParse` and `handleZodError` on failure. Calls `db.tooth.upsert` with `patientId_toothNumber` where clause, updating `status`, `notes` (nullable), and `updatedAt`, and creating the tooth if it doesn't exist. Returns `ok(tooth)`.
- Both files use Next.js 16 awaited-params signature and `NextRequest` from `next/server`.
- Ran `bun run lint` — clean (no errors). Verified via `tsc --noEmit` that the new teeth files produce no type errors (only pre-existing errors in unrelated `examples/`, `skills/`, and the sibling billing route validator file remain).

Stage Summary:
- Two route files added under `src/app/api/teeth/`:
  - `GET /api/teeth/[patientId]` — list a patient's teeth (auth required).
  - `GET /api/teeth/[patientId]/[toothNumber]` — fetch one tooth (auth required, 404 if not found).
  - `PUT /api/teeth/[patientId]/[toothNumber]` — dentist-only upsert of tooth status/notes via `toothUpdateSchema`.
- All handlers wrapped with `withErrors()`; auth via `getUserFromRequest` + `requireRole`; zod validation via `safeParse` + `handleZodError`.
- Lint passes clean; no changes outside `src/app/api/teeth/`.

---
Task ID: 2-d
Agent: treatments-api-builder
Task: Build treatments API routes

Work Log:
- Read worklog, lib files (auth, api-response, db, constants), treatment-schema, and prisma schema to confirm field names, unique constraint (Tooth @@unique([patientId, toothNumber]) => compound key `patientId_toothNumber`), and existing conventions.
- Created 4 route files under `src/app/api/treatments/`:
  1. `[patientId]/route.ts` — GET, authenticated only, returns treatments for patient ordered by date desc.
  2. `tooth/[patientId]/[toothNumber]/route.ts` — GET, authenticated only, returns treatments for a specific tooth (coerces toothNumber to int; returns [] on NaN) ordered by date desc.
  3. `route.ts` — POST, dentist only, validates with `treatmentFormSchema`, runs a `$transaction` that creates the Treatment (dentistId=user.sub, dentistName=user.name, date=now, paid=false) AND updates the Tooth (status="treated", lastTreatment=procedure, lastTreatmentDate=now) via the `patientId_toothNumber` compound key. Returns 201.
  4. `[id]/route.ts` — PUT, dentist only, validates with `treatmentUpdateSchema`, 404s if treatment not found, returns updated treatment.
- All handlers wrapped in `withErrors()`, auth via `getUserFromRequest(req)`, role checks via `requireRole(user, ROLES.DENTIST)` with proper 401/403 mapping, zod `safeParse` + `handleZodError`, Next.js 16 awaited `params`.
- Ran `bun run lint` — clean, no errors.

Stage Summary:
- Treatments API is complete: list-by-patient, list-by-tooth, create (with tooth side effect), and update.
- NOTE for orchestrator: the task spec places both `[patientId]` (GET) and `[id]` (PUT) as sibling dynamic segments under `src/app/api/treatments/`. Next.js App Router requires sibling dynamic segments to share the same slug name, so this will raise a build-time routing error ("You cannot use different slug names for the same dynamic path"). ESLint does not catch this. Recommend consolidating both handlers into a single `treatments/[id]/route.ts` (GET treating the param as patientId, PUT treating it as treatment id), or renaming one segment. The route files as written are functionally correct individually.

---
Task ID: 2-f
Agent: billing-api-builder
Task: Build billing API routes

Work Log:
- Read foundation in worklog.md; reviewed lib/auth, lib/api-response, lib/constants, lib/schemas/billing-schema, prisma schema (Treatment model holds the billing fields: cost, paid, paidAt, paidBy, paymentMethod, paidAmount).
- Created directory tree under src/app/api/billing/ (route.ts, summary/route.ts, [patientId]/route.ts, [treatmentId]/pay/route.ts).
- GET /api/billing: optional `status=paid|unpaid` and `patientId` filters, orders by date desc, manually joins patient names (collects unique patientIds → db.patient.findMany → map → attaches `patientName`). Returns the array of { ...treatment, patientName }.
- GET /api/billing/summary: runs three Prisma aggregates in parallel (all / paid / unpaid) and returns { totalRevenue, collected, unpaid, treatmentCount, paidCount, unpaidCount } with nullish coalescing to 0.
- GET /api/billing/[patientId]: fetches treatments ordered by date desc, runs parallel aggregates for totalCost and paid (unpaid = totalCost - paid). Returns { data: treatments, summary: { totalCost, paid, unpaid, count } }.
- PUT /api/billing/[treatmentId]/pay: staff-only (dentist OR cashier via requireRole), validates body with paymentFormSchema (safeParse + handleZodError), 404s if treatment not found, then updates paid=true, paidAt=new Date(), paidBy=user.name, paymentMethod, paidAmount.
- All handlers wrapped with withErrors(); params awaited as Promise per Next.js 16 (`const { patientId } = await params;`).
- Ran `bun run lint` → exit 0, clean. Also ran `bunx tsc --noEmit` → no errors in any billing route file (pre-existing TS errors only in treatments/, examples/, skills/ which belong to other agents).

Stage Summary:
- Four billing route files added under src/app/api/billing/, all lint-clean and type-safe.
- /api/billing/summary (static segment) is correctly not shadowed by /api/billing/[patientId] (dynamic segment).
- /api/billing/[patientId] and /api/billing/[treatmentId]/pay coexist without route ambiguity because their normalized patterns differ (/api/billing/[*] vs /api/billing/[*]/pay) — verified against the Next.js build's ambiguity check, which flagged only the /api/treatments/[id] vs /api/treatments/[patientId] conflict from another agent, not billing.
- NOTE for orchestrator: `bun run build` currently fails because of an ambiguous-route conflict in src/app/api/treatments/ (both [id] and [patientId] exist at the same level). That is outside the billing scope and needs to be reconciled by whoever owns the treatments routes.

---
Task ID: 3
Agent: main (orchestrator)
Task: Frontend foundation — auth store, api client, nav router, hooks, common components, layout, page orchestrator

Work Log:
- Created `src/lib/types.ts` — shared TS types mirroring backend models (AuthUser, Patient, Tooth, Treatment, Appointment, BillingSummary, PaginatedResponse, etc.).
- Created `src/lib/format.ts` — re-exports meta maps from constants; formatCurrency (₱), formatDate, timeAgo, greetingFor, TIME_SLOTS.
- Created `src/lib/api.ts` — apiFetch (auto Bearer token from sessionStorage), api.get/post/put/del, authApi, toastError. Token key = "radiograph_token".
- Created `src/lib/auth-store.ts` — Zustand store: user, token, loading, initialized, login, register, logout, restore. Plus useIsDentist/Cashier/Patient/Staff/Authenticated selectors.
- Created `src/lib/nav.ts` — Zustand hash-router: view + params, navigate(view, params), back, init. Hash format `#/<view>?<query>`.
- Created `src/hooks/queries.ts` — all React Query hooks: usePatients, usePatient, useCreatePatient, useUpdatePatient, useDeletePatient, useTeeth, useUpdateTooth, useTreatments, useToothTreatments, useCreateTreatment, useUpdateTreatment, useAppointments, useAppointment, useCreateAppointment, useUpdateAppointment, useDeleteAppointment, useBilling, useBillingSummary, usePatientBilling, useRecordPayment, useDebounce. QueryClient defaults: staleTime 30s, retry 1, no refetchOnWindowFocus.
- Created `src/components/common/`: ErrorBoundary (class-based), LoadingSpinner (+ PageLoader), EmptyState, ConfirmDialog (uses AlertDialog), StatusBadge (AppointmentStatusBadge).
- Created `src/components/providers.tsx` — QueryClientProvider + ErrorBoundary + Toaster (Sonner) + session restore on mount.
- Created `src/components/layout/AppShell.tsx` — responsive sidebar (desktop) + Sheet drawer (mobile) + user card with logout. Filters nav items by role.
- Created `src/components/views/*.tsx` — 9 STUB files (LoginView, RegisterView, DashboardView, PatientsView, PatientProfileView, AppointmentsView, BillingView, BookAppointmentView, MyAppointmentsView). These are placeholders to be replaced by subagents.
- Wrote `src/app/page.tsx` — Providers > AuthGate: if not logged in → centered auth view (Login/Register); if logged in → AppShell > AppContent (renders view by nav state, role-gates patient-only views).
- Fixed treatments API route conflict (merged [patientId] GET + [id] PUT into single [id]/route.ts) and billing route conflict (renamed [patientId] + [treatmentId] to unified [id]).

Stage Summary:
- Frontend foundation is complete and compiles (GET / returns 200, lint clean).
- View contract: each view is a default export client component in `src/components/views/<Name>.tsx`, takes NO props, reads route params from `useNav((s) => s.params)` and auth from `useAuth()`.
- Available hooks in `@/hooks/queries`. API helpers in `@/lib/api`. Formatting in `@/lib/format`. Constants/meta maps in `@/lib/format` (re-exported from `@/lib/constants`).
- shadcn/ui components available in `@/components/ui/*`. Common components in `@/components/common/*`.
- Design rules: NO indigo/blue primary. Use emerald/teal/amber/rose palette via Tailwind. Sticky footer behavior handled by AppShell `min-h-screen flex flex-col`.
- Subagents (4-a..4-f) should OVERWRITE their assigned stub view files with real implementations. Do NOT touch other view files. After writing, run `bun run lint` and fix errors in your files only.

---
Task ID: 4-b
Agent: dashboard-builder
Task: Build Dashboard view

Work Log:
- Read worklog.md (foundation + Task 3 frontend setup) and inspected the contract surfaces: auth-store selectors, nav router (ViewName union), queries hooks (usePatients/useAppointments/useBillingSummary), format helpers (greetingFor/formatCurrency/formatDate), types (Appointment, BillingSummary, PaginatedResponse), shadcn Card/Button/Badge/Skeleton, common LoadingSpinner/EmptyState/AppointmentStatusBadge, and the APPOINTMENT_TYPE_META/APPOINTMENT_STATUS_META maps.
- Overwrote `src/components/views/DashboardView.tsx` (stub → full implementation) with a `"use client"`, default-exported, no-props component. Did not touch any other file.
- Layout:
  - Header: greeting (`greetingFor()`) + first-name + role badge (color-coded: emerald/amber/teal for dentist/cashier/patient) + today's date subtitle.
  - Role router inside the view: if `user` missing → LoadingSpinner; if staff → StaffDashboard; if patient → PatientDashboard; else EmptyState "Unknown role".
- Staff dashboard:
  - Stats grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`: Total Patients (usePatients("",1,1).total, emerald, clickable → patients), Upcoming Appointments (count of pending/scheduled with date ≥ today, teal, clickable → appointments), Total Revenue (useBillingSummary.totalRevenue via formatCurrency, amber, clickable → billing), Collected (useBillingSummary.collected via formatCurrency, rose, clickable → billing). Each card: icon in colored rounded-xl square + big number + small hint.
  - Quick Actions: 3 buttons (View Patients, Schedule Appointment, View Billing) implemented as accessible card-buttons with arrow affordance.
  - Upcoming Appointments card: next 5 upcoming (sorted asc) using `getUpcoming()` helper; each row shows patient name (looked up via second usePatients("",1,200) call building a patientId→name Map), type label (via APPOINTMENT_TYPE_META), date (formatDate), time, and AppointmentStatusBadge. Loading → Skeleton rows; empty → EmptyState. "View all" link → appointments.
- Patient dashboard:
  - Welcome card with gradient (emerald→teal) and CTA buttons (Book Appointment → book, View My Appointments → my-appointments).
  - Stats grid (3 cols on lg): Upcoming Appointments count (emerald), Next Appointment date or "None scheduled" (teal, hint shows time if present), Total Visits (count of completed, amber).
  - Quick Actions: Book Appointment + View My Appointments.
  - Upcoming Appointments card (theirs, since API auto-filters) — same row component, EmptyState "Book a visit to see it appear here." when empty.
- Cross-cutting:
  - `useMemo` used for all derived values (upcoming list, counts, patientNameById, nextAppointmentDate, totalVisits).
  - Reusable internal components: StatCard (with skeleton-while-loading + optional click + keyboard a11y), StatCardSkeleton, QuickActionCard, AppointmentRow, UpcomingAppointmentsCard, RoleBadge.
  - `getUpcoming()` helper filters by status ∈ {pending, scheduled} AND `new Date(date).getTime() >= startOfToday()` then sorts by date asc, time asc.
  - Colors strictly from emerald/teal/amber/rose palette — no indigo/blue.
- Verified: `bun run lint` → exit 0, clean. `bunx tsc --noEmit` → no errors in DashboardView.tsx (only pre-existing errors in unrelated `examples/`, `skills/`, and `src/app/api/treatments/route.ts` from other agents).

Stage Summary:
- `src/components/views/DashboardView.tsx` is now a fully-implemented role-aware dashboard.
- Staff (dentist/cashier) see 4 stat cards (patients/upcoming/revenue/collected), quick actions, and a 5-item upcoming appointments list with patient-name resolution.
- Patients see a welcome card, 3 stat cards (upcoming count / next date / total visits), quick actions, and their upcoming appointments list.
- All loading states use Skeleton cards/rows; all empty states use the shared EmptyState. Stat cards and quick actions are clickable and navigate via `useNav`. Lint and type-check clean for this file.

---
Task ID: 4-f
Agent: patient-views-builder
Task: Build Book Appointment + My Appointments views

Work Log:
- Read worklog.md, the stub files, and the supporting lib/utilities (auth-store, nav, hooks/queries, format, constants, appointment-schema, types) plus the shadcn Card/Select/Input/Textarea/Label/Button components and the common LoadingSpinner/EmptyState/StatusBadge components.
- Wrote `src/components/views/BookAppointmentView.tsx`:
  - `"use client"`, default export, no props. Reads `user.patientRef` from `useAuth` and `navigate` from `useNav`.
  - react-hook-form + zodResolver(appointmentFormSchema). Form typed as `z.input<typeof appointmentFormSchema>` so the resolver's Input/Output type split (notes/status use `.optional().default(...)`) type-checks cleanly against useForm's TFieldValues.
  - Fields: Appointment Type (Select of Object.values(APPOINTMENT_TYPES) labeled via APPOINTMENT_TYPE_META), Preferred Date (Input type="date", min=today), Preferred Time (Select of TIME_SLOTS), Notes (Textarea, optional). Used `useWatch` (instead of `watch`) for Select control values to satisfy the `react-hooks/incompatible-library` lint rule.
  - Submit calls `useCreateAppointment().mutateAsync({ patientId: user.patientRef, date, time, type, notes })`. On success → toast.success("Appointment requested!"), switches to a success-state Card with emerald check icon, "Request submitted!" message, and "Book Another" (resets form + clears submitted flag) + "View My Appointments" (navigate("my-appointments")) buttons. On error → toast.error(err.message).
  - Submit button shows "Submitting…" with Loader2 spinner while pending; disabled via `isSubmitting`.
  - Inline validation errors under each field, an amber info note about approval, accessible Label htmlFor / SelectTrigger id / aria-invalid / role="alert".
  - Palette: emerald primary, amber info accent, rose error text. max-w-2xl, single column on mobile.
- Wrote `src/components/views/MyAppointmentsView.tsx`:
  - `"use client"`, default export, no props. Fetches via `useAppointments()` (API auto-filters by patientRef). Header has title + "Book New" button → navigate("book").
  - Groups appointments into Upcoming (status pending/scheduled AND date >= today, sorted asc) and History (everything else, sorted desc) using a `useMemo` over `data ?? []`.
  - Each appointment rendered with an `AppointmentCard` showing weekday+date (toLocaleDateString weekday/month/day/year), time, type label from APPOINTMENT_TYPE_META, AppointmentStatusBadge, and notes (in a muted callout if present). Upcoming cards get a 4px left accent (amber for pending, sky for scheduled); history cards use the default border.
  - EmptyState per section ("No upcoming appointments" with "Book one now" CTA, "No appointment history" plain). LoadingSpinner while isLoading; EmptyState error fallback if isError.
  - max-w-3xl, responsive single column, emerald accent palette.
- Ran `bun run lint` — my two files are clean (the only remaining lint error is in PatientsView.tsx, owned by another agent; per task rules I did not touch it). Ran `bunx tsc --noEmit` and verified BookAppointmentView.tsx + MyAppointmentsView.tsx produce zero type errors (the other TS errors are in BillingView/PatientsView/RegisterView/treatments route/examples/skills — not mine).

Stage Summary:
- BookAppointmentView and MyAppointmentsView are now full implementations (overwrote the stubs).
- Patients can request an appointment via a validated form; on success they see a confirmation state with quick links to book another or view their list.
- Patients can review their upcoming + past appointments in a grouped, sortable, color-accented list with empty states.
- Both views are lint-clean and type-clean; they consume the already-shipped `/api/appointments` collection endpoints (POST auto-sets patientId+status=pending, GET auto-filters to the patient's own).
- No files outside the two assigned view files were modified.

---
Task ID: 4-e
Agent: billing-builder
Task: Build Billing view

Work Log:
- Read worklog.md foundation and inspected all relevant contracts: hooks/queries.ts (useBilling, useBillingSummary, useRecordPayment, usePatients), lib/format.ts (formatCurrency/formatDate/PAYMENT_METHODS/PAYMENT_METHOD_META), lib/schemas/billing-schema.ts (paymentFormSchema uses z.coerce.number() → input/output type divergence), lib/types.ts (BillingRecord = Treatment with optional patientName; BillingSummary), lib/api.ts (toastError), lib/auth-store.ts, and shadcn Card/Button/Input/Select/Badge/Table/Dialog component signatures. Confirmed page.tsx already role-gates the `billing` view for patients, so no in-view auth guard is required.
- OVERWROTE src/components/views/BillingView.tsx with a full "use client" default-exported (no-props) implementation:
  - Header: "Billing" title + "Track treatments and record payments" subtitle.
  - Summary cards row (responsive grid-cols-1 / sm:2 / lg:4): Total Revenue (Wallet, emerald), Collected (CheckCircle, teal), Outstanding (AlertCircle, amber), Total Treatments (Activity, rose). Values from useBillingSummary(); shows an animate-pulse skeleton while summaryQuery.isLoading.
  - Filters bar (Card): Status Select (All/Paid/Unpaid → useBilling({status})) and Patient Select (All patients + list from usePatients("",1,200) → useBilling({patientId})). Filters object is useMemo'd so the query key stays stable.
  - Billing table (shadcn Table inside overflow-x-auto): Patient | Tooth | Procedure | Date | Dentist | Cost | Status | Action. Patient uses record.patientName with patientsMap fallback; Cost right-aligned via formatCurrency; Status is a Badge (emerald "Paid" / amber "Unpaid"); Action shows a "Record Payment" outline Button for unpaid rows and the payment method + paidAt date (muted) for paid rows. LoadingSpinner while loading, EmptyState when empty. API already sorts by date desc.
  - Payment modal (Dialog, controlled by paymentOpen + selectedId): shows patient/procedure/tooth/amount-due summary box. RHF + zodResolver(paymentFormSchema) form with a Controller-driven paymentMethod Select (options from Object.values(PAYMENT_METHODS), labels from PAYMENT_METHOD_META) and a number Input for paidAmount registered directly (defaults to the treatment's cost on open via form.reset, enabling partial payments). On submit → useRecordPayment().mutateAsync({treatmentId, data}) → toast.success("Payment recorded") → close modal; query invalidation auto-refreshes table + summary. Submit button shows a Loader2 spinner while pending; errors surface via toastError.
  - Built a Map<id,name> from usePatients for the filter dropdown and as a display fallback.
- Type-safety: the shared paymentFormSchema uses z.coerce.number(), which gives zodResolver an input type of {paidAmount: unknown} vs PaymentFormValues' output {paidAmount: number}. Since the schema file is out of scope (cannot modify), resolved by importing `Resolver` from react-hook-form and casting `zodResolver(paymentFormSchema) as Resolver<PaymentFormValues>` (runtime coercion unchanged).
- Ran `bunx eslint src/components/views/BillingView.tsx` → EXIT 0 (clean). Ran `bunx tsc --noEmit` → zero errors in BillingView.tsx. Full `bun run lint` has exactly ONE remaining error, and it is in PatientsView.tsx (line 300, react-hooks/set-state-in-effect) — not this task's file; left untouched per the "only touch BillingView.tsx" rule.

Stage Summary:
- BillingView.tsx is complete, lint-clean, and type-safe; ready for staff (dentist + cashier) use.
- Features delivered: 4 summary cards with loading skeletons, status + patient filters with stable query keys, sortable-by-date-desc billing table with paid/unpaid badges and per-row payment actions, and a payment modal supporting all four payment methods with partial-payment support.
- Consumes only the documented contracts (useBilling/useBillingSummary/useRecordPayment/usePatients, paymentFormSchema, formatCurrency/formatDate/PAYMENT_METHODS/PAYMENT_METHOD_META, BillingRecord/BillingSummary types, shadcn primitives, LoadingSpinner/EmptyState, sonner, react-hook-form + zod).
- No files other than src/components/views/BillingView.tsx were modified.
- Known cross-task issue (not mine): project-wide `bun run lint` still fails due to a single error in PatientsView.tsx; that file is owned by another agent.

---
Task ID: 4-a
Agent: auth-views-builder
Task: Build Login + Register views

Work Log:
- Read worklog.md (foundation + Task 3 frontend setup) and inspected the contract surfaces: `useAuth` store (`login`/`register` return the user or throw), `useNav` (`navigate(view, params?)`, ViewName union — note: "login" is NOT in the union), `loginFormSchema`/`registerFormSchema` (register uses `.optional().default("")` on `address` → input/output type divergence), `api` client (`api.post("/api/auth/seed")` for demo seeding), shadcn `Form`/`Input`/`Button`/`Card`/`Textarea` primitives, lucide icons, and `src/app/page.tsx` AuthGate (already centers unauthenticated views with `min-h-screen p-4`).
- OVERWROTE `src/components/views/LoginView.tsx` (stub → full implementation):
  - `"use client"`, default export, no props. Uses RHF + `zodResolver(loginFormSchema)` with `defaultValues: { username: "", password: "" }`.
  - Layout: full-screen `min-h-screen` wrapper with `bg-gradient-to-br from-emerald-50 via-background to-teal-50` (+ dark variants, NO indigo/blue), flex-centered. Inner `max-w-md` Card with shadow-lg.
  - Header: Stethoscope icon in `size-12 rounded-xl bg-primary text-primary-foreground` square, "Welcome back" title, "Sign in to your Radiograph account" subtitle.
  - Fields: username (User icon prefix), password (Lock icon prefix + Eye/EyeOff toggle button, `type="button" variant="ghost" size="icon"` absolutely positioned, `aria-label` toggles, `tabIndex={-1}`). FormControl Slot wraps the Input directly (not the relative div) so FormLabel's htmlFor resolves to the input's id.
  - Submit: `login(values.username, values.password)` → on success `toast.success(\`Welcome back, ${user.name}\`)` + `navigate("dashboard")`; on error `toast.error(err.message)`. Button shows a CSS spinner + "Signing in…" while `form.formState.isSubmitting`.
  - Demo creds info box (emerald-tinted): two clickable chip buttons ("Dentist: dentist / dentist123", "Cashier: cashier / cashier123") that call `form.setValue(...)` to autofill. A "Seed demo data" link button calls `api.post("/api/auth/seed")` with a `seeding` loading flag and success/error toasts — useful if the DB was reset.
  - Footer link: "Don't have an account? Register as a patient" → `navigate("register")`.
  - A11y: `noValidate` on form, `aria-busy` when submitting, FormLabel provides accessible labels, eye toggle has dynamic aria-label, chips have descriptive aria-labels.
- OVERWROTE `src/components/views/RegisterView.tsx` (stub → full implementation):
  - `"use client"`, default export, no props. RHF + `zodResolver(registerFormSchema)`.
  - Type handling: the schema's `address: z.string().optional().default("")` produces an INPUT type with `address?: string | undefined` and an OUTPUT type with `address: string`. Since I cannot modify the schema file (out of scope), I typed the form values as `z.input<typeof registerFormSchema>` (local alias `RegisterFormValues`) so the resolver's input/output split type-checks cleanly against `useForm`'s `TFieldValues`. In `onSubmit`, `address` is coerced with `?? ""` when building the payload.
  - Layout: same emerald/teal gradient wrapper, `max-w-lg` Card. Header: Stethoscope logo square, "Create your patient account" title, "Register to book appointments and track your dental care" subtitle.
  - Fields: Full name, Username, Password + Confirm Password (2-col grid on sm+, both with show/hide toggles via independent `showPassword`/`showConfirm` state), Phone + Email (2-col grid), Date of birth (`type="date"`), Address (Textarea, optional, marked "(optional)"). Every field has a leading lucide icon (User/Lock/Mail/Phone/Calendar/MapPin). All inline errors render via `FormMessage`.
  - Submit: builds a payload EXCLUDING `confirmPassword`, calls `register(payload)` → on success `toast.success("Account created! Welcome to Radiograph")` + `navigate("dashboard")`; on error `toast.error(err.message)`. Button shows spinner + "Creating account…" while submitting.
  - Footer link: "Already have an account? Sign in" → `navigate("dashboard")` (per task instructions: since "login" isn't a ViewName, navigating to "dashboard" while unauthenticated causes the page orchestrator to render LoginView).
- Verified: `bunx eslint src/components/views/LoginView.tsx src/components/views/RegisterView.tsx` → EXIT 0 (clean, no output). `bunx tsc --noEmit` filtered to my two files → zero errors. Full `bun run lint` shows 4 errors, ALL in sibling files `PatientsView.tsx` and `PatientProfileView.tsx` (owned by other agents); my files are clean.

Stage Summary:
- `src/components/views/LoginView.tsx` and `src/components/views/RegisterView.tsx` are now full implementations (stubs overwritten).
- Login: polished emerald-gradient card with logo header, username/password fields with show/hide, clickable demo-credential chips, a seed-demo-data helper, and a register link. Full loading + error toast handling.
- Register: full patient-registration form (name, username, password+confirm with show/hide, phone, email, DOB, optional address) with inline validation, loading state, and a "Sign in" link back to login.
- Both views consume only the documented contracts (useAuth.login/register, useNav.navigate, loginFormSchema/registerFormSchema, sonner toast, react-hook-form + @hookform/resolvers/zod, shadcn Form/Input/Textarea/Button/Card, lucide icons, api.post for the seed endpoint).
- No files other than the two assigned view files were modified.
- Known cross-task issues (not mine): project-wide `bun run lint` still fails due to errors in PatientsView.tsx and PatientProfileView.tsx; those files are owned by other agents.

---
Task ID: 4-d
Agent: appointments-builder
Task: Build Appointments view

Work Log:
- Read worklog.md to absorb the foundation (auth-store, hooks/queries, format helpers, common components, shadcn primitives). Inspected the appointment schema, types, and existing DashboardView for code conventions.
- Overwrote `src/components/views/AppointmentsView.tsx` (was a 5-line stub) with a complete staff-only client component (~855 lines, default export, no props). No other files touched.
- Top-level layout: header (title "Appointments" + "New Appointment" button), shadcn Tabs (List / Schedule / Requests), and a shared `NewAppointmentDialog` lifted to the parent so the header button, the List empty-state CTA, and the Schedule "+" buttons can all open it (optionally pre-filled with date/time).
- `usePatientMap()` helper calls `usePatients("", 1, 200)` once and builds a `Map<id, name>` via `useMemo`. Shared across tabs through RQ cache; lookups fall back to "Unknown" per spec.
- Tab 1 (List): status filter Select (All / pending / scheduled / completed / cancelled / no-show) that re-queries with `useAppointments({ status })`; appointments grouped by `apptDateToYMD(a.date)` (UTC parts — matches the server's UTC-day storage), groups sorted ascending, items within a group sorted by time. Each row shows time, capitalized type chip, patient name + notes, and an inline status Select that fires `useUpdateAppointment().mutateAsync({ id, data: { status } })` + success toast. Dentist-only trash button opens a ConfirmDialog before `useDeleteAppointment().mutateAsync(id)`. Empty state with CTA.
- Tab 2 (Schedule): inline `@/components/ui/calendar` (react-day-picker) for date selection, default = today. Selected date → `localToYMD(selectedDate)` (local parts) → `useAppointments({ date })`. Renders TIME_SLOTS (08:00–18:00) vertically; each slot shows appointment cards (patient name, type, status badge) or an "Available" `+` button that opens the dialog pre-filled with that date + time. Appointments whose time falls outside TIME_SLOTS are surfaced in a dashed "Other times" section so nothing is hidden. Calendar + slots stack on mobile, side-by-side on `lg`.
- Tab 3 (Requests): `useAppointments({ status: "pending" })`, sorted by date/time. Each card shows patient name, type chip, date/time, notes, and Approve (→ status "scheduled" + `toast.success`) / Decline (→ status "cancelled" + `toast.info`) buttons. Approve/Decline disabled while the update mutation is in flight. `EmptyState` titled "No pending requests" when empty.
- NewAppointmentDialog: react-hook-form + `zodResolver(appointmentFormSchema)`. Fields: patient (Select from `usePatients("", 1, 200)`, with a loading/empty placeholder item), date (`<input type="date">`), time (Select of `TIME_SLOTS`), type (Select of `APPOINTMENT_TYPES`), notes (Textarea). Hidden `status: "scheduled"` is sent on submit. Form resets to defaults + preset whenever `open` becomes true or the preset changes. Submit → `useCreateAppointment().mutateAsync(payload)` + `toast.success` + close. Used `useWatch` (hook-based) instead of `watch()` to keep React-Compiler happy and silence an `incompatible-library` warning. Resolved the zod v4 + RHF v7.60 resolver type mismatch by typing `useForm` with the three generics (`z.input` as field values, `AppointmentFormValues` as transformed output).
- Date helpers: `localToYMD` (local parts) for the calendar's selected day, `apptDateToYMD` (UTC parts) for stored appointment dates (server stores them as UTC midnight), and `formatYMD` for timezone-safe display — avoids the off-by-one you'd get from the local-time `formatDate` helper when displaying a calendar day.
- Ran `bun run lint` — 0 errors, 0 warnings (exit 0). Also verified `bunx tsc --noEmit` produces no errors in AppointmentsView.tsx (remaining project-wide tsc errors are in examples/, skills/, treatments/route.ts, and PatientProfileView.tsx — owned by other agents).

Stage Summary:
- `src/components/views/AppointmentsView.tsx` is a complete staff-only appointments manager with three tabs (List, Schedule, Requests) plus a shared New Appointment dialog. Lint-clean and type-clean.
- All required contracts honored: `useAuth`/`useIsDentist`, `useAppointments/useCreateAppointment/useUpdateAppointment/useDeleteAppointment/usePatients("", 1, 200)`, `appointmentFormSchema`, `formatDate`/`TIME_SLOTS`/`APPOINTMENT_TYPE_META`/`APPOINTMENT_STATUS_META`/`APPOINTMENT_STATUSES`/`APPOINTMENT_TYPES` from `@/lib/format`, shadcn `Card/Button/Input/Label/Textarea/Select/Badge/Tabs/.../Dialog/Calendar`, and `LoadingSpinner/EmptyState/ConfirmDialog/AppointmentStatusBadge` from `@/components/common/*`.
- Single `useAppointments` call per tab (filter changes the query key → auto-refetch on tab switch). One `usePatients("", 1, 200)` shared via RQ cache for the patient-name map and the dialog dropdown.
- Dentist-only delete; both staff roles can create / update / approve / decline. Responsive layout (cards stack on mobile, calendar+slots go side-by-side on `lg`, requests grid goes 1→2→3 columns).

---
Task ID: 4-c
Agent: patients-views-builder
Task: Build Patients list + Patient profile + Dental chart + Tooth modal

Work Log:
- Read worklog.md foundation + existing stubs (PatientsView, PatientProfileView), lib helpers (auth-store, nav, format, api, types), queries hook, patient/treatment/billing schemas, constants (TOOTH_STATUS_META), and shadcn UI components (button, card, dialog, select, form, input, textarea, badge, tabs, skeleton, avatar).
- OVERWROTE `src/components/views/PatientsView.tsx` (~420 lines):
  - Header: title "Patients" + subtitle; dentist-only "Add Patient" button (useIsDentist).
  - Search input with 300ms debounce via `useDebounce`; search icon overlay; placeholder "Search by name, email, or phone…". Page resets to 1 on each keystroke (in onChange, not useEffect — avoids lint react-hooks/set-state-in-effect).
  - Responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`) of patient cards. Each card: avatar w/ initials, name, phone, email, dateOfBirth (formatDate), chevron. Clicking navigates to `patient-profile` view with `{ id: patient.id }`.
  - Loading state: 6 skeleton cards. Error state: EmptyState. Empty state: EmptyState with action button when no search.
  - Pagination: prev/next + "Page X of Y" indicator, only when totalPages > 1.
  - AddPatientDialog: react-hook-form + zodResolver(patientFormSchema). Fields: name, phone, email, dateOfBirth (date input), address, notes. On submit → useCreatePatient().mutateAsync → toast.success + close dialog.
  - PatientFormFields sub-component takes `Control<PatientFormInput, any, PatientFormOutput>` so it can be reused by the Edit dialog in PatientProfileView.
- OVERWROTE `src/components/views/PatientProfileView.tsx` (~1155 lines):
  - Reads patientId from `useNav((s) => s.params).id`. Missing id → EmptyState "No patient selected".
  - Loading skeleton, error/missing EmptyState, back button → navigate("patients").
  - Patient info card: avatar w/ initials, name, "Patient since" createdAt, contact (phone/email), demographics (DOB/address), notes. Dentist-only "Edit" + "Delete" buttons in card header.
  - EditPatientDialog: same PatientFormFields component, prefilled from patient record, calls useUpdatePatient on submit.
  - DeletePatient: ConfirmDialog (destructive) → useDeletePatient → on success navigate("patients").
  - **Dental Chart**: DentalChart component renders all 32 teeth in 2 rows of 16 with a vertical divider. UPPER_ROW = [1..16] left-to-right (patient's right then left quadrant). LOWER_ROW = [32,31..25, 24,23..17] left-to-right. Each tooth = rounded-t-full rounded-b-md button (h-11 w-6 sm:h-14 sm:w-9) colored by `TOOTH_STATUS_META[status].color`, tooth number centered in white, hover ring + translate-y lift. Wrapped in overflow-x-auto with min-w-[480px] inner container so it scrolls on mobile. Includes "Patient's Right"/"Patient's Left" labels and a 4-color legend below.
  - Clicking a tooth opens ToothModal (Dialog, sm:max-w-[600px], max-h-[90vh] overflow-y-auto):
    - Header: "Tooth #N" + status badge + description w/ last treatment/notes.
    - Status editor (dentist only): Select for status (healthy/treated/needs-attention/urgent) + Textarea for notes + Save button → useUpdateTooth.mutateAsync({ patientId, toothNumber, data: { status, notes } }).
    - Treatment timeline: useToothTreatments(patientId, toothNumber) — list of treatments newest-first, each showing procedure, date, dentistName, cost, paid badge, optional followUpDate.
    - Add Treatment form (dentist only): treatmentFormSchema fields (procedure, cost, followUpDate optional, notes). patientId/toothNumber are fixed hidden defaults. On submit → useCreateTreatment.mutateAsync.
    - Status draft state is synced to underlying tooth using the React-19 "previous value" pattern (store prevStatus/prevNotes + wasOpen; resync during render when they change OR when the dialog opens), avoiding setState-in-effect lint error.
  - TreatmentHistory component: table sorted by date desc, columns Tooth/Procedure/Date/Dentist/Cost/Status, paid/unpaid badges.
- Lint fixes applied:
  - Removed setState-in-effect: replaced `useEffect(() => setPage(1), [search])` with `setPage(1)` in the search onChange handler.
  - Extracted the inner `Row` component out of `DentalChart` to module-level `ChartRow` (react-hooks/static-components rule).
  - Used the React "store prev value" render-time pattern to sync status/notes drafts (instead of useEffect).
  - Used `z.input<typeof schema>` / `z.output<typeof schema>` as the 1st/3rd generics of useForm so the zodResolver types line up with zod v4 schemas that use `.optional().default()` and `z.coerce.number()` (which produce different input vs output types). Cast cost field value via `typeof field.value === "number"` narrowing for the unknown-typed coerced field.
- Ran `bun run lint` → exit 0, no errors, no warnings in my files. Ran `bunx tsc --noEmit` → no type errors in PatientsView.tsx or PatientProfileView.tsx (only pre-existing errors in unrelated examples/skills/api/treatments files remain).

Stage Summary:
- PatientsView.tsx is complete: search w/ debounce, paginated responsive grid, dentist-gated add-patient dialog wired to useCreatePatient.
- PatientProfileView.tsx is complete: patient info card w/ edit/delete (dentist-gated), full 32-tooth interactive dental chart with quadrant divider + legend + per-tooth click handling, ToothModal with status editor + treatment timeline + add-treatment form, and a sortable treatment history table.
- All dentist-only actions (add patient, edit patient, delete patient, edit tooth status, add treatment) gated by `useIsDentist()`. Cashiers can view the list, profile, and chart but cannot mutate.
- All state-sync uses React 19 idioms (no setState-in-effect). Components are static-declared (no in-render component definitions).
- Files modified: only `src/components/views/PatientsView.tsx` and `src/components/views/PatientProfileView.tsx` (ToothModal kept inline as a sub-component per spec).

---
Task ID: 5 + 6
Agent: main (orchestrator)
Task: Wire up main page orchestrator + verify with agent browser

Work Log:
- Wrote `src/app/page.tsx` — Providers > AuthGate > AppContent. AuthGate shows centered auth view when unauthenticated, AppShell-wrapped content when authenticated. AppContent renders the current view based on nav state, with role-gating for patient-only views.
- Updated `src/app/layout.tsx` metadata — title "Radiograph — Dental Practice Management".
- Fixed Next.js routing conflicts: merged treatments [patientId]+[id] into single [id]/route.ts; renamed billing [patientId]+[treatmentId] to unified [id].
- Verified with agent browser (end-to-end):
  - Login as dentist (demo credentials) → dashboard renders with 4 stat cards, quick actions, upcoming appointments ✓
  - Patients list → 4 seeded patients with search + pagination ✓
  - Patient profile → interactive 32-tooth dental chart (color-coded: green/blue/orange/pink), legend, all teeth clickable ✓
  - Tooth modal (Tooth #19 Urgent) → status editor, treatment timeline, add-treatment form ✓
  - Created treatment "Root canal treatment" ₱8,500 → tooth auto-updated to "Treated", treatment appeared in timeline ✓
  - Billing → summary cards (₱8,500 revenue, ₱0 collected, ₱8,500 outstanding), table with the treatment, "Record Payment" modal ✓
  - Recorded payment → summary updated (₱8,500 collected, ₱0 outstanding), row shows "Paid" ✓
  - Appointments → List/Schedule/Requests tabs, pending requests visible ✓
  - Patient registration → form renders with all fields ✓
  - Patient login → role-based dashboard (Book Appointment, My Appointments nav only) ✓
  - Book Appointment form renders correctly ✓
  - Full appointment lifecycle via API: patient books (pending) → dentist approves (scheduled) → patient sees update ✓
- VLM screenshot analysis: desktop dashboard "clean, professional, well-aligned, green/teal/orange/pink (no indigo/blue)"; mobile "responsive, hamburger menu, no overflow"; dental chart "32 teeth, color-coded, legend present, professional".
- Lint: clean (0 errors). Dev log: no runtime errors.

Stage Summary:
- The application is COMPLETE and fully verified end-to-end.
- All 3 roles (dentist, cashier, patient) functional with proper permission gating.
- All core features working: auth, dashboard, patients + dental chart + tooth modal + treatments, appointments (list/schedule/requests + approve/decline), billing (summary + table + payment), patient self-service (book + my appointments).
- Responsive (desktop sidebar + mobile hamburger). Professional visual design with emerald/teal/amber/rose palette.
- Demo credentials: dentist/dentist123, cashier/cashier123. Patients can self-register.

---
Task ID: 7
Agent: main (orchestrator)
Task: Replace dental chart with the uploaded oral cavity SVG illustration

Work Log:
- Analyzed uploaded /home/z/my-project/upload/202402_Oral_Cavity.svg (Adobe Illustrator, 400x400 viewBox, 437 paths, 8755 lines).
- Discovered structure: 32 teeth as <path id="tooth-N" class="st222" d="..."/> (st222 = white fill), sitting on a detailed pink/red gum + palate + tongue anatomy background.
- Extracted the 32 tooth path "d" attributes into src/lib/tooth-paths.ts as a Record<number, string> + TOOTH_NUMBERS array.
- Created public/charts/oral-cavity-base.svg = the original SVG with tooth paths removed (676KB, keeps full gum/palette anatomy + style block).
- Created src/components/common/OralCavityChart.tsx — a new React component that:
  - Renders the anatomy SVG as a background <image> (preserving the realistic oral cavity look).
  - Overlays all 32 teeth as interactive <path> elements colored by status using explicit hex fills (emerald/sky/amber/rose) with stroke + opacity.
  - Hover: drop-shadow + thicker stroke + a floating tooltip showing tooth number, status label, and last treatment.
  - Click: calls onSelectTooth(num) to open the existing ToothModal.
  - Selected tooth gets a dark selection ring (synced with modalTooth state).
  - Subtle dashed midline divides left/right quadrants; "Patient's Right/Left" orientation labels.
  - Legend below shows all 4 statuses with live counts per status.
- Wired OralCavityChart into PatientProfileView: imported the component, replaced <DentalChart> with <OralCavityChart teeth onSelectTooth selectedTooth={modalTooth} />.
- Removed now-dead code: ToothButton, ChartRow, DentalChart functions + UPPER_ROW/LOWER_ROW constants from PatientProfileView.
- Verified in browser: chart renders with realistic gums + 32 color-coded teeth; clicking a tooth opens the ToothModal; no console errors; VLM rated the visual design 8/10 ("polished and clinical").

Stage Summary:
- The dental chart is now a clinically-realistic interactive oral cavity illustration instead of the previous grid of tooth-shaped buttons.
- The uploaded SVG's anatomy (gums, palate, tongue) is preserved as a static background; teeth are overlaid as interactive SVG paths.
- File artifacts: src/lib/tooth-paths.ts (14KB), public/charts/oral-cavity-base.svg (676KB), src/components/common/OralCavityChart.tsx.
- Lint clean, no runtime errors. Existing ToothModal (status edit + treatment timeline + add treatment) works unchanged.
