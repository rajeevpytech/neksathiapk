# Nek Sathi — Product Requirements Document

## Original Problem Statement
Build a React Native (Expo) personal-safety + mobile-security app "Nek Sathi" for Android & iOS.
CRITICAL: Do NOT build a backend — connect to the EXISTING live backend at
`https://neksathi-live.emergent.host/api` (JWT bearer auth) and reuse it exactly as-is.

## Architecture
- Frontend: Expo SDK 54, expo-router (file-based), TypeScript.
- Backend: EXISTING live production API (not modified). Base URL in `frontend/.env` → `EXPO_PUBLIC_API_URL`.
- Auth: JWT bearer stored in expo-secure-store (key `neksathi_token`); refreshed via GET /auth/me on launch.
- API client: `src/lib/api.ts` (typed fetch wrapper, timeout, error parsing).
- State: AuthContext (`src/context/AuthContext.tsx`), ToastContext.
- Design: "iOS-Native Clean" — Deep Blue #0B284D + Emergency Red #DC2626, Plus Jakarta Sans, per `/app/design_guidelines.json`.
- Native libs: expo-camera, react-native-maps, expo-location (fg+bg), expo-sensors, expo-audio (siren), expo-haptics, expo-speech (EN/HI voice), expo-notifications, @gorhom/bottom-sheet, react-native-keyboard-controller, react-native-qrcode-svg.

## User Personas
- Everyday user needing one-tap emergency help (SOS, live location).
- Parent/guardian tracking family members on a map with safe zones.
- Vehicle owner protecting bikes/cars with QR tags, tracking, lost mode, crash detection.
- Anyone protecting their phone from theft (remote lock, intruder selfie, SIM-swap alert).
- A good samaritan who scans a QR tag to safely alert an owner without seeing their number.

## Implemented (2026-06)
- Auth: email login, phone OTP login, register, forgot/reset password, secure token, auto-login, logout.
- Dashboard: greeting + status, big pulsing SOS button, bento grid, quick access.
- One-Tap SOS: 5s countdown, POST /me/sos with GPS, loud siren (expo-audio) + heavy vibration + EN/HI voice (expo-speech), sent/error states.
- Emergency Contacts: full CRUD + set primary.
- SOS History: list + acknowledge.
- Live Location: timed shares (create/list/stop) + foreground GPS loop posting /me/location + share link.
- Safe Zones: react-native-maps with tap-to-place center, radius chips, circles; create/list/delete.
- Family Guardian: create/join family, invite code, live member map + glass bottom sheet with battery/last-seen.
- Vehicles: CRUD, QR tag (rendered), lost mode, speed limit, up-to-4 contacts, last-known-location map track, delete.
- QR Scanner + public report: scan vehicle/tag QR, report reasons (emergency/wrong_parking/theft/fire/towing/sos), masked owner call — owner number never shown.
- Alerts feed: incident/SOS/speed/zone list with typed icons.
- Crash detection: accelerometer impact detection → countdown → POST /vehicles/{id}/accident (safe/need_help/no_response).
- SOS video: expo-camera recording → chunked resumable upload (init/chunk/status/complete).
- Theft Protection: register device, remote lock/unlock, remote siren, SIM-swap report, intruder selfie capture.
- Settings/Profile: edit name/phone, notification prefs (gated by notify_prefs), change password, logout.
- Push notifications wired (expo-notifications, POST /register-push, tap → action_url routing). Needs google-services.json + native build to fully work.

## Verified
- Frontend testing agent passed all auth + CRUD + navigation + live-backend integration flows (iteration_1.json). No blockers.

## Backlog / Remaining
- P1: Real background GPS via expo-task-manager (needs dev build) for location sharing when app backgrounded.
- P1: Push google-services.json + native build to enable server pushes on device.
- P2: WebRTC in-app masked voice call (currently uses backend masked-call endpoint / dialer).
- P2: Android Device Admin (DevicePolicyManager) for true remote lock + silent intruder capture.
- P2: Avatar image upload on Edit Profile.
- P2: Migrate shadow* → boxShadow to silence RN Web logs.

## Native-only (require APK/IPA build, not Expo Go/web)
Background location, push delivery, WebRTC calls, Device Admin lock, silent camera capture, SIM-swap detection.
