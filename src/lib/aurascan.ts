// AuraScan link (browser side). AuraScan is an optional, separate face
// recognition server. When the site has no AuraScan settings, or the AuraScan
// computer is switched off, getAuraConfig() reports "not enabled" and every
// page keeps using LearnLive's own built-in face photos exactly as before.
import supabase from './supabase';

export interface AuraConfig { enabled: boolean; url?: string; public_key?: string; reason?: string }
export interface AuraStep { id: string; instruction: string }

let cached: { at: number; cfg: AuraConfig } | null = null;

// Asks our own server (api/aurascan.js) whether AuraScan is switched on and
// reachable. Cached for one minute so pages don't keep asking.
export async function getAuraConfig(force = false): Promise<AuraConfig> {
  if (!force && cached && Date.now() - cached.at < 60_000) return cached.cfg;
  let cfg: AuraConfig = { enabled: false, reason: 'unavailable' };
  try {
    const r = await fetch('/api/aurascan?action=config');
    const d = await r.json().catch(() => null);
    if (r.ok && d) cfg = d;
  } catch { /* offline -> keep LearnLive's own flow */ }
  cached = { at: Date.now(), cfg };
  return cfg;
}

// Calls api/aurascan.js with the signed-in user's Supabase token.
export async function auraAction(action: string, body: Record<string, unknown> = {}): Promise<any> {
  const { data } = await supabase.auth.getSession();
  const tok = data?.session?.access_token;
  const r = await fetch('/api/aurascan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    body: JSON.stringify({ action, ...body }),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && d.error) || 'Face service error');
  return d;
}

// Is this account's face registered in AuraScan? (false on any problem)
export async function auraEnrolled(): Promise<boolean> {
  try { return !!(await auraAction('status')).enrolled; } catch { return false; }
}

// Low-level calls made straight to the AuraScan server with the PUBLIC key.
// They only run the live head-turn scan; the result is a one-time scan ID.
export async function auraScanStart(cfg: AuraConfig): Promise<{ challenge_id: string; steps: AuraStep[]; expires_in: number }> {
  return auraDirect(cfg, '/scan/start', {});
}
export async function auraScanFrame(cfg: AuraConfig, challenge_id: string, image: string): Promise<any> {
  return auraDirect(cfg, '/scan/frame', { challenge_id, image });
}
async function auraDirect(cfg: AuraConfig, path: string, body: unknown) {
  let r: Response;
  try {
    r = await fetch(`${cfg.url}/api/v1${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': cfg.public_key || '' }, body: JSON.stringify(body) });
  } catch { throw new Error('Cannot reach the face scanner right now. Check your internet and try again.'); }
  const d = await r.json().catch(() => null);
  if (!r.ok) {
    const det = d?.detail;
    const msg = typeof det === 'string' ? det : det?.message || 'Face scan error';
    throw Object.assign(new Error(msg), { status: r.status });
  }
  return d;
}

// Marks "this tab just signed in with a face scan" so the follow-up face check
// after sign-in is not asked twice.
export const FACE_LOGIN_FLAG = 'aura_face_login';
