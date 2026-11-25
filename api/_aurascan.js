// Shared AuraScan helpers (imported by api/aurascan.js and api/attendance.js).
// Not an endpoint itself, the same pattern as _gamification.js / db-client.js.
//
// AuraScan is a separate face-recognition server (live head-turn face scan,
// liveness, real face matching). LearnLive only LINKS to it: nothing here is
// required for LearnLive to work. If the AURASCAN_* settings are missing or
// the AuraScan server is switched off, every page falls back to LearnLive's
// own built-in face photos, exactly as before.
//
// Server settings (hosting dashboard -> Environment variables):
//   AURASCAN_URL         e.g. https://aurascan-pc.tail1234.ts.net   (no trailing /)
//   AURASCAN_PUBLIC_KEY  pk_...  (safe for browsers: only used to run the live scan)
//   AURASCAN_SECRET_KEY  sk_...  (server only, NEVER put it in src/ or VITE_ vars)
import crypto from 'node:crypto';

export const AURA_URL = (process.env.AURASCAN_URL || '').trim().replace(/\/+$/, '');
export const AURA_PK = (process.env.AURASCAN_PUBLIC_KEY || '').trim();
const AURA_SK = (process.env.AURASCAN_SECRET_KEY || '').trim();

// AuraScan is "configured" when the server has all three settings.
export const auraConfigured = () => !!(AURA_URL && AURA_PK && AURA_SK);

// Every LearnLive account is stored in AuraScan with this external ID, so
// AuraScan members from other systems can never be mistaken for a LearnLive user.
export const extId = (userId) => `learnlive:${userId}`;
export const userIdFromExt = (ext) => (typeof ext === 'string' && ext.startsWith('learnlive:') ? ext.slice(10) : '');

// Call the AuraScan integration API (/api/v1/...) with the SECRET key.
export async function aura(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`${AURA_URL}/api/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-API-Key': AURA_SK },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { detail: e?.name === 'AbortError' ? 'AuraScan did not answer in time' : 'AuraScan is offline' } };
  } finally { clearTimeout(t); }
}

// AuraScan error -> one plain sentence for the user.
export function auraError(res, fallback = 'Face service error') {
  const d = res?.data?.detail ?? res?.data?.reason ?? res?.data?.error;
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  if (d.message) return d.message;
  if (Array.isArray(d)) return d.map(x => x.msg || '').filter(Boolean).join('; ') || fallback;
  return fallback;
}

// ---- Check-in proof --------------------------------------------------------
// After AuraScan confirms the face, api/aurascan.js hands the browser a short
// signed proof. api/attendance.js only marks "face verified" when that proof is
// valid for the same user and the same lesson, so the browser can no longer
// simply send face_verified: true.
const PROOF_TTL = 10 * 60; // seconds
const b64u = (b) => Buffer.from(b).toString('base64url');
const sign = (msg) => crypto.createHmac('sha256', `learnlive-checkin:${AURA_SK}`).update(msg).digest('base64url');

export function makeProof(userId, sessionId, score) {
  const body = b64u(JSON.stringify({ u: String(userId), s: String(sessionId), sc: score ?? null, exp: Math.floor(Date.now() / 1000) + PROOF_TTL }));
  return `${body}.${sign(body)}`;
}

export function checkProof(proof, userId, sessionId) {
  if (!AURA_SK || typeof proof !== 'string' || !proof.includes('.')) return false;
  const [body, sig] = proof.split('.');
  const good = sign(body);
  if (!sig || sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.u === String(userId) && p.s === String(sessionId) && p.exp > Date.now() / 1000;
  } catch { return false; }
}

// ---- Who is calling? ---------------------------------------------------------
// The browser sends its Supabase access token; we ask Supabase who it belongs to.
export async function userFromReq(supabase, req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const jwt = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
  if (!jwt) return null;
  try {
    const { data, error } = await supabase.auth.getUser(jwt);
    if (error) return null;
    return data?.user || null;
  } catch { return null; }
}
