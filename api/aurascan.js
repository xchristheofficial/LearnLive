// AuraScan link for LearnLive: live face scan registration, face check-in for
// lessons, and face sign-in. The browser runs the live head-turn scan directly
// against AuraScan (public key) and then sends only the scan's ID here; this
// function finishes the job with the SECRET key, which never leaves the server.
//
//   GET  /api/aurascan?action=config        -> is AuraScan switched on and online?
//   GET  /api/aurascan?action=pubkey        -> this site's PUBLIC key, for linking it in AuraScan
//   POST /api/aurascan {action:'status'}    -> is my face registered in AuraScan?     (signed in)
//   POST /api/aurascan {action:'enroll'}    -> register / refresh my face            (signed in)
//   POST /api/aurascan {action:'verify'}    -> is this live face really me?          (signed in)
//   POST /api/aurascan {action:'checkin'}   -> face check-in proof for a lesson       (signed in)
//   POST /api/aurascan {action:'unenroll'}  -> delete my face data from AuraScan      (signed in)
//   POST /api/aurascan {action:'login'}     -> sign in with email + live face scan
import supabase from './db-client.js';
import { AURA_URL, KEYS_MODE, LINK_MODE, auraConfigured, auraBrowserKey, linkStatus, sitePublicKey, siteFingerprint, aura, auraError, extId, userIdFromExt, makeProof, userFromReq } from './_aurascan.js';

const cors = (req, res) => { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); if (req.method === 'OPTIONS') { res.status(204).end(); return true; } return false; };
const bodyOf = (req) => { if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch { return {}; } } return req.body || {}; };

async function findMember(userId) {
  const r = await aura(`/persons/lookup?identifier=${encodeURIComponent(extId(userId))}`);
  if (r.status === 404) return { member: null };
  if (!r.ok) return { error: auraError(r, 'AuraScan is not reachable right now'), status: r.status };
  return { member: r.data?.person || null };
}

// 1:1 check: does this passed live scan match THIS LearnLive account?
async function verifyFace(userId, challengeId) {
  const r = await aura('/login', { method: 'POST', body: { identifier: extId(userId), challenge_id: challengeId } });
  if (r.status === 429) return { verified: false, reason: auraError(r, 'Too many tries. Wait a few minutes.') };
  if (r.status === 400 && /password first/i.test(auraError(r, ''))) return { verified: false, reason: 'AuraScan setup problem: on the AuraScan Developers / API page, make a new LearnLive SECRET key with sign-in mode "Face scan only" (see the setup guide)' };
  if (!r.ok) return { verified: false, reason: auraError(r, 'Face check failed') };
  const d = r.data || {};
  return { verified: !!d.verified, score: d.score ?? null, reason: d.verified ? '' : (d.reason || 'Face does not match this account') };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const action = (req.method === 'GET' ? req.query?.action : bodyOf(req).action) || 'config';

    // ---------------------------------------------------------------- config
    if (action === 'config') {
      if (!auraConfigured()) return res.status(200).json({ enabled: false, reason: 'not_configured' });
      if (LINK_MODE) {
        const pk = await auraBrowserKey();
        if (!pk) {
          const st = linkStatus().status;
          return res.status(200).json({ enabled: false, reason: st === 401 || st === 403 ? 'not_linked' : 'offline', mode: 'linked' });
        }
        return res.status(200).json({ enabled: true, url: AURA_URL, public_key: pk, mode: 'linked' });
      }
      const h = await aura('/health', { timeoutMs: 4000 });
      if (!h.ok) return res.status(200).json({ enabled: false, reason: 'offline' });
      return res.status(200).json({ enabled: true, url: AURA_URL, public_key: await auraBrowserKey(), mode: 'keys' });
    }

    // ---------------------------------------------------------------- pubkey
    // Public information only: AuraScan reads it when an admin links this website.
    if (action === 'pubkey') {
      if (!LINK_MODE) return res.status(200).json({ app: 'LearnLive', public_key: '', error: KEYS_MODE ? 'This site uses AuraScan keys from the hosting settings, so no link is needed' : 'AuraScan is not set up on this site' });
      return res.status(200).json({ app: 'LearnLive', public_key: sitePublicKey(), fingerprint: siteFingerprint(), aurascan_url: AURA_URL });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!auraConfigured()) return res.status(503).json({ error: 'AuraScan is not switched on for this site' });
    const b = bodyOf(req);

    // ----------------------------------------------------------------- login
    // Email + live face scan. Same answer for an unknown email and a wrong face,
    // so nobody can use this to find out who has an account.
    if (action === 'login') {
      const email = String(b.email || '').trim();
      if (!email || !b.challenge_id) return res.status(400).json({ error: 'Enter your email and scan your face' });
      const NO = { verified: false, reason: 'Face does not match this account' };
      let prof = null;
      for (const e of [...new Set([email.toLowerCase(), email])]) {
        const { data } = await supabase.from('profiles').select('id,email,full_name').eq('email', e).maybeSingle();
        if (data) { prof = data; break; }
      }
      if (!prof) return res.status(200).json(NO);
      const v = await verifyFace(prof.id, b.challenge_id);
      if (!v.verified) return res.status(200).json({ verified: false, reason: v.reason || NO.reason });
      const { data: au, error: e1 } = await supabase.auth.admin.getUserById(prof.id);
      if (e1 || !au?.user?.email) return res.status(200).json({ verified: false, reason: 'This account cannot use face sign-in yet' });
      const { data: link, error: e2 } = await supabase.auth.admin.generateLink({ type: 'magiclink', email: au.user.email });
      const tokenHash = link?.properties?.hashed_token;
      if (e2 || !tokenHash) return res.status(500).json({ error: 'Could not start the sign-in. Try your password.' });
      return res.status(200).json({ verified: true, score: v.score, email: au.user.email, user_id: prof.id, token_hash: tokenHash });
    }

    // Everything below needs a signed-in LearnLive user.
    const user = await userFromReq(supabase, req);
    if (!user) return res.status(401).json({ error: 'Please sign in again' });

    // ---------------------------------------------------------------- status
    if (action === 'status') {
      const f = await findMember(user.id);
      if (f.error) return res.status(502).json({ error: f.error });
      return res.status(200).json({ enrolled: !!f.member });
    }

    // ---------------------------------------------------------------- enroll
    if (action === 'enroll') {
      if (!b.challenge_id) return res.status(400).json({ error: 'A live face scan is needed' });
      const f = await findMember(user.id);
      if (f.error) return res.status(502).json({ error: f.error });
      if (f.member) {
        const r = await aura(`/persons/${f.member.id}/faces`, { method: 'POST', body: { challenge_id: b.challenge_id } });
        if (r.status === 409) return res.status(409).json({ error: 'This face is already registered to another account' });
        if (!r.ok) return res.status(400).json({ error: auraError(r, 'Could not save your face') });
        return res.status(200).json({ ok: true, enrolled: true, refreshed: true, warnings: r.data?.warnings || [] });
      }
      const { data: prof } = await supabase.from('profiles').select('id,email,full_name,role').eq('id', user.id).maybeSingle();
      const base = {
        challenge_id: b.challenge_id, name: (prof?.full_name || user.email || 'LearnLive user').slice(0, 120),
        external_id: extId(user.id), role: prof?.role || 'student', group_name: 'LearnLive',
        metadata: { source: 'learnlive', learnlive_user_id: user.id },
      };
      const email = (prof?.email || user.email || '').trim();
      let r = await aura('/signup', { method: 'POST', body: email ? { ...base, email } : base });
      // The email may already belong to someone added to AuraScan another way:
      // register without it (the scan is not used up by that check).
      if (!r.ok && email && r.status !== 409 && /email/i.test(auraError(r, ''))) r = await aura('/signup', { method: 'POST', body: base });
      if (r.status === 409) return res.status(409).json({ error: 'This face is already registered to another account' });
      if (!r.ok) return res.status(400).json({ error: auraError(r, 'Could not register your face') });
      return res.status(200).json({ ok: true, enrolled: true, refreshed: false });
    }

    // ---------------------------------------------------------------- verify
    if (action === 'verify') {
      if (!b.challenge_id) return res.status(400).json({ error: 'A live face scan is needed' });
      return res.status(200).json(await verifyFace(user.id, b.challenge_id));
    }

    // --------------------------------------------------------------- checkin
    if (action === 'checkin') {
      if (!b.challenge_id || b.session_id === undefined || b.session_id === null) return res.status(400).json({ error: 'A live face scan and a lesson are needed' });
      const v = await verifyFace(user.id, b.challenge_id);
      if (!v.verified) return res.status(200).json(v);
      return res.status(200).json({ ...v, proof: makeProof(user.id, b.session_id, v.score) });
    }

    // -------------------------------------------------------------- unenroll
    if (action === 'unenroll') {
      const f = await findMember(user.id);
      if (f.error) return res.status(502).json({ error: f.error });
      if (!f.member) return res.status(200).json({ ok: true, enrolled: false });
      if (userIdFromExt(f.member.external_id) !== user.id) return res.status(403).json({ error: 'Not your face record' });
      const r = await aura(`/persons/${f.member.id}`, { method: 'DELETE' });
      if (!r.ok) return res.status(502).json({ error: auraError(r, 'Could not delete your face data') });
      return res.status(200).json({ ok: true, enrolled: false });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) { res.status(500).json({ error: err.message }); }
}
