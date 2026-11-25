// Shared AuraScan helpers (imported by api/aurascan.js and api/attendance.js).
// Not an endpoint itself, the same pattern as _gamification.js / db-client.js.
//
// AuraScan is a separate face-recognition server (live head-turn face scan,
// liveness, real face matching). LearnLive only LINKS to it: nothing here is
// required for LearnLive to work. If the AURASCAN_* settings are missing or
// the AuraScan server is switched off, every page falls back to LearnLive's
// own built-in face photos, exactly as before.
//
// Two ways to connect (the first one found is used):
//  A) Hosting settings (Environment variables), if you can reach them:
//       AURASCAN_URL, AURASCAN_PUBLIC_KEY (pk_...), AURASCAN_SECRET_KEY (sk_..., server only)
//  B) "Linked website", when you can only change the code on GitHub:
//       the address comes from api/_aurascan_config.js, and this server SIGNS its requests with its own
//       key made from SUPABASE_SERVICE_ROLE_KEY (which the hosting already has). Nothing secret is in
//       the code. An AuraScan admin links the site once: Developers / API -> Linked websites -> Link.
import crypto from 'node:crypto';
import CONFIG from './_aurascan_config.js';

export const AURA_URL = (process.env.AURASCAN_URL || CONFIG?.url || '').trim().replace(/\/+$/, '');
const ENV_PK = (process.env.AURASCAN_PUBLIC_KEY || '').trim();
const AURA_SK = (process.env.AURASCAN_SECRET_KEY || '').trim();
const SRK = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
export const KEYS_MODE = !!(AURA_URL && ENV_PK && AURA_SK);
export const LINK_MODE = !KEYS_MODE && !!(AURA_URL && SRK);
export const AURA_PK = ENV_PK;

// AuraScan is "configured" when this site knows an AuraScan address and has a way to prove who it is.
export const auraConfigured = () => KEYS_MODE || LINK_MODE;

const b64u = (b) => Buffer.from(b).toString('base64url');

// ---- Linked website: this server's own Ed25519 key, derived from the Supabase service key ----
const SEED = LINK_MODE ? crypto.createHmac('sha256', SRK).update('aurascan-linked-site-v1').digest() : null;
const PRIV = SEED ? crypto.createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), SEED]), format: 'der', type: 'pkcs8' }) : null;
const PUB_RAW = PRIV ? crypto.createPublicKey(PRIV).export({ format: 'der', type: 'spki' }).subarray(-32) : null;
export const sitePublicKey = () => (PUB_RAW ? b64u(PUB_RAW) : '');
export const siteFingerprint = () => {
  if (!PUB_RAW) return '';
  const h = crypto.createHash('sha256').update(PUB_RAW).digest('hex').slice(0, 16).toUpperCase();
  return h.match(/.{4}/g).join(' ');
};

// Every LearnLive account is stored in AuraScan with this external ID, so
// AuraScan members from other systems can never be mistaken for a LearnLive user.
export const extId = (userId) => `learnlive:${userId}`;
export const userIdFromExt = (ext) => (typeof ext === 'string' && ext.startsWith('learnlive:') ? ext.slice(10) : '');

// Call the AuraScan integration API (/api/v1/...) with the SECRET key.
export async function aura(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const p = `/api/v1${path}`;
    const raw = body === undefined ? undefined : JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json' };
    if (KEYS_MODE) headers['X-API-Key'] = AURA_SK;
    else if (LINK_MODE) {
      // Signed request: time + method + path + body hash, so it cannot be changed or sent again.
      const ts = String(Math.floor(Date.now() / 1000));
      const h = crypto.createHash('sha256').update(raw || '').digest('hex');
      headers['X-Aura-Site'] = sitePublicKey();
      headers['X-Aura-Ts'] = ts;
      headers['X-Aura-Sig'] = b64u(crypto.sign(null, Buffer.from(`${ts}\n${method.toUpperCase()}\n${p}\n${h}`), PRIV));
    }
    const r = await fetch(`${AURA_URL}${p}`, { method, headers, body: raw, signal: ctl.signal });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { detail: e?.name === 'AbortError' ? 'AuraScan did not answer in time' : 'AuraScan is offline' } };
  } finally { clearTimeout(t); }
}

// ---- The browser key (pk_) for the live scan ----------------------------------
// Hosting settings: AURASCAN_PUBLIC_KEY. Linked website: AuraScan made one when the site was linked;
// this server fetches it with a signed request (kept for a minute).
let ME = { at: 0, ok: false, status: 0, data: null };
export async function auraBrowserKey() {
  if (KEYS_MODE) return AURA_PK;
  if (!LINK_MODE) return '';
  const age = Date.now() - ME.at;
  if (age < (ME.ok ? 60000 : 15000)) return ME.ok ? ME.data?.public_key || '' : '';
  const r = await aura('/sites/me', { timeoutMs: 5000 });
  ME = { at: Date.now(), ok: !!(r.ok && r.data?.public_key), status: r.status, data: r.data };
  return ME.ok ? ME.data.public_key : '';
}
export const linkStatus = () => ME;

// Must "face verified" come from AuraScan? Always with hosting keys (as before). As a linked website:
// while AuraScan is linked and reachable. If the AuraScan PC is off, LearnLive works as it did before.
export async function auraStrict() {
  if (KEYS_MODE) return true;
  if (!LINK_MODE) return false;
  return !!(await auraBrowserKey());
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
const PROOF_KEY = AURA_SK ? `learnlive-checkin:${AURA_SK}` : (SRK ? crypto.createHmac('sha256', SRK).update('learnlive-checkin-v1').digest('hex') : '');
const sign = (msg) => crypto.createHmac('sha256', PROOF_KEY).update(msg).digest('base64url');

export function makeProof(userId, sessionId, score) {
  const body = b64u(JSON.stringify({ u: String(userId), s: String(sessionId), sc: score ?? null, exp: Math.floor(Date.now() / 1000) + PROOF_TTL }));
  return `${body}.${sign(body)}`;
}

export function checkProof(proof, userId, sessionId) {
  if (!PROOF_KEY || typeof proof !== 'string' || !proof.includes('.')) return false;
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
