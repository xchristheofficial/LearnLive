# AuraScan face verification for LearnLive (optional)

LearnLive can link to **AuraScan**, a separate face recognition server, for stronger face checks.
It is **optional**. If the three settings below are missing, or the AuraScan computer is switched off,
LearnLive works exactly as it does today, with its own built-in face photos.

## What it adds

| Where | Without AuraScan (today) | With AuraScan |
|---|---|---|
| Face Registration (`/face-setup`) | 3 photos | One **live** head-turn scan (also saves the 3 photos as before) |
| Face check after sign-in (`/face-check`) | On-device photo comparison | Live scan, matched by AuraScan (1:1, this account only) |
| Lesson check-in (`/room/:id`) | Browser decides "face verified" | AuraScan confirms the face; the **server** decides "face verified" |
| Sign-in page (`/login`) | Email + password, Google | Also **"Sign in with my face"**: email + live scan, no password |

A photo or a phone screen cannot pass the live scan. The same face cannot be registered on two accounts.

## Settings (hosting → Environment variables, server side only)

```
AURASCAN_URL=https://<your-aurascan-address>        # no trailing slash
AURASCAN_PUBLIC_KEY=pk_...                          # browser key: only runs the live scan
AURASCAN_SECRET_KEY=sk_...                          # server only, never in src/ or VITE_ variables
```

Create the keys in AuraScan: **Developers / API → Connected systems (API keys)**.
- Secret key (sk_), sign-in mode **Face scan only** (or "Face scan OR username & password").
- Public key (pk_), sign-in mode **Username & password AND face scan (2-step)**. The browser only uses it
  to run the scan, and this mode stops it from being used to identify faces on its own.

Redeploy after changing settings. The browser reads them at run time through `GET /api/aurascan?action=config`,
so the address can change without a rebuild.

## Files

- `api/_aurascan.js`: shared helpers (AuraScan calls, check-in proof, who is calling).
- `api/aurascan.js`: actions `config`, `status`, `enroll`, `verify`, `checkin`, `unenroll`, `login`.
- `api/attendance.js`: when AuraScan is on, `face_verified` needs a valid signed proof from `api/aurascan.js`
  for the same user and lesson (10-minute lifetime). Without AuraScan settings, nothing changes.
- `src/lib/aurascan.ts` and `src/components/AuraScanCapture.tsx`: browser side and live scan UI.
- `src/pages/FaceSetup.tsx`, `FaceCheck.tsx`, `Room.tsx`, `Auth.tsx`: use AuraScan when it is on and fall back otherwise.

No database changes. LearnLive users are stored in AuraScan with `external_id = learnlive:<supabase user id>`
and group "LearnLive". Face sign-in creates the Supabase session with `auth.admin.generateLink` (no email is sent)
and the browser finishes it with `auth.verifyOtp`.

## Privacy

Face data is also kept on the AuraScan server. The Face Registration page says this, and users can delete
their AuraScan face data there at any time. Under Kenya's Data Protection Act 2019, face data is sensitive
personal data: get consent (a parent's or guardian's for learners under 18) and say where the server is.
