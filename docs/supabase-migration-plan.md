# Supabase Removal Plan

## Goal

Replace Supabase completely with a self-owned backend and Postgres stack, while preserving current behavior in one release:

- phone-based sign-in
- session persistence and refresh
- profile onboarding
- circles and memberships
- emergency alerts, responders, and alert chat
- push notification fanout
- realtime updates
- native widget alert triggering
- account deletion

## Status

Implementation completed on March 6, 2026.

Progress snapshot:

- [x] Phase 0: baseline stabilized and Jest suite fixed
- [x] Phase 1: app moved into `/frontend` and direct Supabase usage replaced with internal clients
- [x] Phase 2: Phoenix backend built in `/backend` with auth, profiles, circles, alerts, realtime, jobs, and account deletion
- [x] Phase 3: Android and iOS widget code migrated to backend API clients and non-Supabase credential storage
- [x] Phase 4: Supabase export importer added for users, profiles, circles, memberships, alerts, responses, and messages
- [x] Phase 5: frontend cut over to `EXPO_PUBLIC_API_URL`, Channels, and backend REST endpoints
- [x] Phase 6: old `/supabase` assets, `supabase-setup.sql`, Supabase package usage, and Supabase-only test helpers removed

Verification completed:

- `cd frontend && npm test -- --runInBand`: `16` suites passed, `156` tests passed
- `docker compose exec backend bash -lc 'unset PHX_SERVER; export MIX_ENV=test DATABASE_HOST=postgres DATABASE_NAME=boton_backend_test; mix test'`: `14` tests passed
- `docker compose ps`: backend healthy on `:4000`, Postgres healthy
- `curl http://localhost:4000/auth/otp/request ...`: endpoint responds successfully from the running Phoenix app
- `mix boton.import_supabase --dir ...`: smoke-tested successfully against sample exports

Release note:

- Native widget code paths were migrated and renamed in-repo, but no simulator or physical-device build was run in this environment.

The target repo shape should be:

```text
/frontend   Expo / React Native app
/backend    Phoenix / Elixir API + realtime + jobs
/docs
/docker-compose.yml
```

## Current Supabase Surface Area

### 1. Auth

Current app behavior:

- SMS OTP sign-in and verification from the mobile app
- session persistence in AsyncStorage
- auth state subscriptions in `AuthContext`
- sign-out
- refresh token support for native widgets
- delete-account flow through a Supabase edge function

Current code locations:

- `lib/supabase.ts`
- `contexts/AuthContext.tsx`
- `app/(auth)/login.tsx`
- `app/(tabs)/settings.tsx`
- `plugins/withAlertWidget/android/SupabaseClient.kt`
- `plugins/withAlertWidget/ios/SupabaseClient.swift`
- `supabase/functions/delete-account/index.ts`

### 2. Direct Database Access From Client

The frontend currently talks to Supabase directly for:

- `profiles`
- `circles`
- `circle_members`
- `alerts`
- `alert_responses`
- `alert_messages`

This logic is spread across:

- `lib/alerts.ts`
- `lib/alertHistory.ts`
- `lib/circles.ts`
- `lib/notifications.ts`
- `app/(tabs)/index.tsx`
- `app/(tabs)/circles.tsx`
- `app/(tabs)/settings.tsx`
- `app/(onboarding)/display-name.tsx`
- `app/(onboarding)/location.tsx`
- `app/alert/[id].tsx`

### 3. Realtime

The app uses Supabase realtime `postgres_changes` for:

- alert status changes
- alert response changes
- alert message inserts
- history refresh

This currently lives in:

- `lib/alerts.ts`
- `lib/alertHistory.ts`

### 4. Backend Logic Hidden In Database / Edge Functions

Supabase is doing more than storage:

- profile auto-creation on signup
- RLS-based authorization
- helper functions to avoid RLS recursion
- notification fanout trigger on alert create / expand
- edge function to send Expo push notifications
- edge function to delete accounts

Current sources:

- `supabase/migrations/*.sql`
- `supabase/functions/send-alert/index.ts`
- `supabase/functions/delete-account/index.ts`

### 5. Native Widget Integration

The native widget path is tightly coupled to Supabase today:

- JS syncs Supabase access token, refresh token, URL, and publishable key into native storage
- Android and iOS widget code refresh tokens against Supabase auth
- widget code creates alerts by posting directly to Supabase REST

This is a hard migration requirement. The backend replacement must expose equivalent auth refresh and alert creation APIs for widget use.

### 6. What Supabase Is Not Doing

Not currently used:

- Supabase Storage
- Supabase RPC
- file uploads
- server-side rendering helpers
- row-level broadcast / presence features

That keeps the migration narrower than a full platform replacement.

## Recommendation

Use Elixir with Phoenix.

Why it fits this app:

- Phoenix Channels are a strong replacement for Supabase realtime
- Ecto + Postgres give better control over correctness than client-side direct SQL access
- OTP supervision, jobs, and process isolation are a good fit for mission-critical alerting
- Oban gives reliable background work for push fanout and retry handling
- Phoenix is operationally simpler than stitching together separate Node services for API, realtime, and jobs

If the team has near-zero Elixir appetite, a TypeScript backend is still viable. But based on the requirements you stated, Phoenix is the stronger choice.

## Target Backend Architecture

### Core stack

- Phoenix API app in `/backend`
- Postgres in Docker Compose
- Ecto migrations for schema ownership
- Phoenix Channels for realtime
- Oban for notification jobs and retries
- OpenTelemetry / structured logging from day one

### Data model

Preserve the existing domain model, but make authorization explicit in backend code instead of RLS:

- `users`
- `phone_otp_challenges`
- `refresh_tokens`
- `profiles`
- `circles`
- `circle_members`
- `alerts`
- `alert_responses`
- `alert_messages`
- `push_delivery_attempts`

Recommended changes:

- keep UUIDs stable so current user/profile/circle relations can migrate cleanly
- store phone OTP codes hashed, never plaintext
- store refresh tokens hashed, never plaintext
- add explicit unique and foreign-key constraints for every membership and response invariant
- keep `geohash` for compatibility, but add PostGIS `geography(Point, 4326)` for correct nearby search and indexing

### Auth

Replace Supabase auth with:

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `POST /auth/refresh`
- `POST /auth/logout`
- `DELETE /me`

Recommended token model:

- short-lived signed access JWT
- long-lived opaque refresh token stored hashed in Postgres

This matches the current app and widget refresh needs without tying correctness to client storage.

### Realtime

Replace `postgres_changes` subscriptions with Phoenix Channels:

- `user:{user_id}:alerts`
- `alert:{alert_id}`

Channel payloads should cover:

- alert updates
- response list refresh or response delta
- message inserts

Keep payloads intentionally small and stable so the frontend can stay simple.

### Push notifications

Do not re-implement the current DB-trigger pattern.

Use:

1. DB transaction creates / updates alert
2. app enqueues Oban job in the same transaction
3. job resolves recipients
4. job sends Expo notifications
5. job stores delivery attempt records for audit and retry

This is easier to test, easier to observe, and safer than HTTP calls from SQL triggers.

### Widget support

Backend must provide:

- token refresh endpoint
- alert creation endpoint

Native credential stores should hold:

- backend base URL
- access token
- refresh token
- user ID
- expiry

The widget code can stay structurally similar, but it must stop depending on Supabase-specific payloads, URLs, and keys.

## Tests To Add Before Migration

The existing Jest suite is useful, but it is not enough for this cutover.

Current state:

- most tests mock Supabase at module boundaries
- they verify UI wiring, not backend semantics
- current suite is not fully green: `__tests__/screens/settings.test.tsx` already fails in the harness

### Required pre-migration test work

1. Fix the existing red Jest suite so the baseline is trustworthy.
2. Add frontend contract tests around a backend client abstraction, not around Supabase directly.
3. Add backend integration tests against a real Postgres database.
4. Add realtime tests for alert/channel behavior.
5. Add widget-path tests for token refresh and alert creation.

### Critical scenarios to cover

- request OTP, verify OTP, restore session, refresh session, sign out
- first-time user creates profile automatically or via onboarding completion path
- edit profile and save push token
- create circle, join circle, leave circle, owner remove member, owner delete circle
- create alert
- cancel alert
- resolve alert
- expand alert to nearby users
- respond to alert with each status transition
- message inside alert
- history shows sent, responded, and received alerts
- delete account removes accessible data and invalidates sessions
- widget can refresh token and create alert without opening the app

### Test strategy

Keep three layers:

- frontend component and screen tests for UI behavior
- backend integration tests for domain correctness
- a small number of end-to-end smoke tests for the alert path

Do not try to make Jest prove backend correctness by piling on more Supabase mocks.

## One-Shot Migration Sequence

This is still a single cutover, but it should be implemented in controlled stages on one branch.

### Phase 0: Stabilize the baseline

- fix the failing settings test suite
- remove any stale env naming inconsistencies
- document current flows and acceptance criteria
- stop adding new Supabase-dependent features while migration is in flight

### Phase 1: Introduce a frontend seam

Without changing behavior yet:

- move the app into `/frontend`
- replace direct `supabase` imports with an internal client layer
- define typed frontend services for auth, profile, circles, alerts, messages, and realtime
- make `AuthContext` depend on the internal auth client, not Supabase types

This is the key move that makes the cutover manageable.

### Phase 2: Build the backend in `/backend`

- scaffold Phoenix app
- add Docker Compose Postgres + backend services
- create Ecto schema and migrations
- implement auth endpoints
- implement profile endpoints
- implement circles endpoints
- implement alerts, responses, and messages endpoints
- implement Expo push worker flow with Oban
- implement Phoenix Channels
- implement account deletion
- implement rate limiting and audit logging around auth and alert creation

Mission-critical requirement:

- alert creation, responder writes, and job enqueueing must be transactionally correct

### Phase 3: Migrate native widget paths

- replace native Supabase clients with generic backend API clients
- replace refresh-token endpoint usage
- replace alert creation endpoint usage
- rename native storage keys away from Supabase-specific names
- verify Android and iOS widget flows against the new backend

### Phase 4: Data migration

Export from Supabase:

- auth user IDs and phone numbers
- profiles
- circles
- circle_members
- alerts
- alert_responses
- alert_messages

Recommended approach:

- preserve user UUIDs
- import data into the new Postgres schema
- require users to re-authenticate after cutover instead of trying to migrate active sessions

This is much safer than attempting token portability.

### Phase 5: Frontend cutover

- switch frontend env vars to `EXPO_PUBLIC_API_URL`
- switch widget env vars to backend values
- replace realtime wiring with Channels
- replace delete-account call with backend REST
- remove Supabase package and all direct imports

### Phase 6: Cleanup

- delete `/supabase`
- delete `supabase-setup.sql`
- remove `@supabase/supabase-js`
- remove Supabase env vars from EAS config and examples
- rename any remaining `SupabaseClient` native classes
- remove dead retry helpers and mocks that only existed for Supabase

## Proposed Repo Layout

```text
/frontend
  /app
  /components
  /contexts
  /lib
  package.json
  app.json
  eas.json

/backend
  /lib
  /priv/repo/migrations
  /test
  mix.exs

/docs
  supabase-migration-plan.md

/docker-compose.yml
```

## API Compatibility Notes

Frontend modules that will need adapters:

- `AuthContext`
- `lib/alerts.ts`
- `lib/alertHistory.ts`
- `lib/circles.ts`
- `lib/notifications.ts`
- onboarding profile / location screens
- settings delete-account flow
- native widget clients

Recommended frontend env changes:

- remove `EXPO_PUBLIC_SUPABASE_URL`
- remove `EXPO_PUBLIC_SUPABASE_KEY`
- add `EXPO_PUBLIC_API_URL`
- keep `EXPO_PUBLIC_PROJECT_ID`

## Key Risks

### 1. Phone OTP is the hardest feature to replace correctly

You need:

- SMS provider integration
- resend rules
- abuse protection
- code expiry
- device/session handling
- good failure UX

This deserves first-class backend tests.

### 2. Realtime semantics must stay stable

The alert screen depends on live updates for:

- alert status
- responders
- messages

Realtime is part of the core product, not a nice-to-have.

### 3. Widget auth refresh is easy to overlook

If the widget refresh path is missed, the main app may work while the fastest emergency path breaks.

### 4. Nearby expansion should become more correct, not less

The current geohash-prefix approach is approximate. For the self-hosted backend, use spatial queries if possible.

### 5. The current codebase contains secret/config cleanup work

Examples already present:

- Supabase-specific publishable values in `eas.json`
- a hardcoded bearer token in `supabase/migrations/008_fix_alert_trigger.sql`
- inconsistent env naming between `.env.example` and runtime code

These should be removed as part of the migration cleanup.

## Definition Of Done

The migration is done only when all of the following are true:

- frontend no longer imports Supabase anywhere
- native widget code no longer imports or names Supabase-specific clients
- backend owns all auth, authorization, realtime, and push fanout
- local development works from Docker Compose
- existing UI tests are green
- backend integration tests are green
- alert creation, response, chat, history, and delete-account flows are verified
- Supabase config, SQL, functions, and packages are deleted from the repo

## Next Step

The migration work in this document is implemented. The remaining pre-release task is a manual Android and iOS widget smoke test against the backend to confirm native build and runtime behavior on device or simulator.
