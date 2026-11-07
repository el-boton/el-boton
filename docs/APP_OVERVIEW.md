# El Botón — app overview (context for planning)

You're helping Sara, an 11-year-old builder, plan and build changes to El Botón. Lee (her mentor) reviews every change and handles deploys. Explain things simply, show her results on screen, and help her make real product decisions. Don't decide for her.

## What the app is

El Botón ("The Button") is a live community-safety app with real users, in English and Spanish. In an emergency, you hold one big red button for 3 seconds. Your trusted "circles" (family, neighbors, friends) instantly get an alert with your location, and they can respond and coordinate until you're safe.

## What a user can do today

1. **Sign in with a phone number.** A 6-digit code arrives by SMS or WhatsApp. There are no passwords.
2. **Onboarding:** welcome → pick a display name (shown to your circle when you alert) → allow location → allow notifications. The app explains why each permission matters and warns you if you skip it.
3. **Alert tab (home):** the Big Red Button. You hold it for 3 seconds, with feedback while you hold ("Keep holding…", "Almost there…", "Sending!"). Letting go early cancels. After an alert there's a 5-minute cooldown, with a "This is real, send anyway" override. The tab also shows status: system ready, location or notifications off, circle and member counts, and the last alert.
4. **Alert detail screen** (`/alert/[id]`), with a live, realtime view of one alert:
   - The sender sees who responded and can **cancel** it (false alarm), mark it **resolved** ("I'm Safe"), or **expand to nearby**, which also alerts other El Botón users near them who aren't in their circles.
   - Responders tap **I See This → On My Way → Arrived**. They can open the location on a map with directions.
   - Everyone involved can **chat** in the alert's message thread.
5. **Circles tab:** create a circle (you can own up to 10) and share its 6-character invite code or a join link. You can join with a code, see members (owner, you, and whose notifications are off), remove members, leave or delete a circle, and **send a test alert**.
6. **History tab:** active alerts first, then past ones (resolved or cancelled). It includes alerts you sent and alerts you responded to.
7. **Settings:** display name, phone, location and notification permissions, language (English/Spanish), version, sign out, and delete account.
8. **Home-screen widget and Siri/App Shortcuts** (iOS and Android): trigger an alert without opening the app.

There's also a partner integration where tablets in vacation villas act as emergency buttons. It's server-to-server, and Sara shouldn't need to touch it.

## How it's built

```
frontend/   Expo (React Native) app — this is where UI work happens
backend/    Elixir + Phoenix API, Postgres + PostGIS (location queries)
```

### Frontend (`frontend/`)
- **Expo SDK 54, React Native 0.81, TypeScript, expo-router** (file-based routes).
- **Screens** live in `app/`:
  - `(auth)/login.tsx`: phone number and code
  - `(onboarding)/welcome, display-name, location, notifications`
  - `(tabs)/index.tsx` (button), `circles.tsx`, `history.tsx`, `settings.tsx`, `_layout.tsx` (tab bar)
  - `alert/[id].tsx`: the alert detail screen (the biggest screen)
  - `_layout.tsx`: the root layout (auth gating, notification handling)
- **Components** live in `components/`: `BigRedButton`, `PrimaryButton`, `StyledInput`, `ModalSheet`, `ScreenLayout`, `EmptyState`, `CountryPicker`, `ProgressIndicator`.
- **Styling is Tamagui** (`tamagui.config.ts`). The current design system is called "Deep Ink & Copper": a dark theme with true neutral blacks and a warm copper accent. **Emergency red is reserved only for the panic button.** That rule matters, because red has to mean "emergency" and nothing else.
- **Text is i18n**: every user-facing string lives in `locales/en.json` and `locales/es.json`, used through `react-i18next`. A new string means adding it to **both** files and never hardcoding text in a component.
- **Logic** lives in `lib/`: `api/*` (HTTP calls to the backend), `api/realtime.ts` (live updates over Phoenix channels), `alerts.ts` (sending alerts, cooldown), `circles.ts`, `location.ts`, `notifications.ts`. `contexts/AuthContext.tsx` holds the logged-in user.
- Native extras: `plugins/withAlertWidget` (the widget and shortcuts), `plugins/withCriticalAlerts.js` (iOS critical alerts that break through silent mode), and `modules/native-location`. Because of these, the app runs as a custom dev build, not in Expo Go.
- **Tests:** Jest with React Native Testing Library, in `__tests__/` and `components/__tests__/`. Run them with `npm test`.

### Backend (`backend/`)
- Phoenix JSON API. Core logic is in `lib/boton_backend/` (`accounts`, `circles`, `alerts`, `notifications`, `privacy`). HTTP controllers are in `lib/boton_backend_web/controllers/`, and realtime channels (`alert_channel`, `user_alerts_channel`) push live alert updates to phones.
- Main API routes:
  - Auth: `POST /auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout`
  - Me: `GET/PATCH /me/profile`, `PUT /me/location`, `DELETE /me`
  - Circles: list, create, join, members, test_alert, leave, remove member, delete
  - Alerts: create, show, history, cancel, resolve, expand, responses (get and put), messages (get and post)
- Push notifications go through Expo's push service. Locally, SMS codes are printed in the backend logs instead of texted.
- Privacy: location data expires and gets redacted after a while, and "nearby" uses only recent locations.
- Tests are in `test/`. Run `mix test`, or `mix precommit` before finishing backend work.

## Local dev loop
- Backend: run `docker compose up` from the repo root. It's at `http://localhost:4000`. Login codes appear in the logs as `DEV OTP for <phone>: <code>`.
- App: run `cd frontend && npx expo start`, then press `i` for the iOS Simulator. Saving a file hot-reloads.
- Use two simulators with two fake phone numbers in the same circle to see an alert being sent *and* received.

## Rules for working on this app
1. **The emergency flow must always work.** That covers holding the button → alert sent → circle notified → alert screen. It also covers login, onboarding permissions and the responder buttons. After any change near these, test them by hand in the simulator, and the tests must pass.
2. **Run `npm test`** (and `mix test` for backend changes) before saying something is done. If a test breaks, fix the cause. Don't delete the test.
3. **Every new string goes in both `en.json` and `es.json`.**
4. **Red means emergency.** Don't use it for decoration.
5. Keep it fast and readable under stress. Someone might be using this in a real emergency, with shaky hands, in the dark, or in bright sunlight. Use big tap targets, high contrast and clear words.
6. Work on a branch named `sara/<what-it-is>`. Lee reviews and ships it.
7. Don't touch auth, privacy, partner code, deploy files or secrets without asking Lee first.
8. Plan before building. For a big redesign, start with mockups or a few design directions, let Sara pick, then build one screen at a time.
