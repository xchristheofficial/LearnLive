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

## Switching it on: two ways

### Way 1: "Linked website" (no keys, only GitHub needed) - used by LearnLive
1. `api/_aurascan_config.js` holds the AuraScan **address** (not a secret):
   `url: 'https://desktop-8avfe05.tail6dcbd1.ts.net'`.
2. LearnLive's server makes its own Ed25519 key pair from `SUPABASE_SERVICE_ROLE_KEY`, which the hosting
   already has. The private half never leaves the server and is not in the code.
   The public half is at `GET /api/aurascan?action=pubkey`.
3. In AuraScan (3.8.1 or newer): **Developers / API -> Linked websites**, type
   `https://learnlive-7zfo.arcada.app`, press **Link**. AuraScan reads the public key and shows its fingerprint.
4. Every server call to AuraScan is then signed (time + method + path + body hash). AuraScan rejects
   unsigned, changed, old (over 5 minutes) or repeated requests. The browser scan key (pk_) is made by
   AuraScan and fetched by the server automatically.

Remove the website in AuraScan and the face features switch off at once. If the AuraScan PC is off,
LearnLive works as before (no "Face verified" badge until it is back).

### Way 2: hosting settings (if you can reach them) - these win when set
```
AURASCAN_URL=https://<your-aurascan-address>        # no trailing slash
AURASCAN_PUBLIC_KEY=pk_...                          # browser key: only runs the live scan
AURASCAN_SECRET_KEY=sk_...                          # server only, never in src/ or VITE_ variables
```
Create the keys in AuraScan: **Developers / API -> Connected systems (API keys)**
(secret key with sign-in mode "Face scan only"; public key with "Password AND face scan (2-step)").

To switch AuraScan off completely: set `url: ''` in `api/_aurascan_config.js` (and remove any AURASCAN_* settings).

## Files

- `api/_aurascan_config.js`: the AuraScan address (no secrets).
- `api/_aurascan.js`: shared helpers (signed AuraScan calls, check-in proof, who is calling).
- `api/aurascan.js`: actions `config`, `pubkey`, `status`, `enroll`, `verify`, `checkin`, `unenroll`, `login`.
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
