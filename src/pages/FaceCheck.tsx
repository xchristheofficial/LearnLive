import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ScanFace, GraduationCap, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import FaceCapture from '../components/FaceCapture';
import { useAuth } from '../contexts/AuthContext';
import { api, uploadDataUrl } from '../lib/api';
import { bestFaceMatch, FACE_MATCH_THRESHOLD } from '../lib/faceMatch';
import { toast } from '../lib/toastBus';

// Runs right after sign-in: if this account already has a registered face,
// the camera opens automatically, auto-detects + auto-captures a quick
// verification photo, and that photo is compared on-device against the
// account's registered face photos. Only a real match lets the sign-in
// through — a face that doesn't match the account (e.g. someone else
// signing into a different person's account) is blocked here instead of
// being waved through, with a retry or sign-out option. Brand-new /
// unregistered accounts skip straight to Face Registration instead.
export default function FaceCheck() {
  const { user, profile, loading, signOut } = useAuth(); const nav = useNavigate();
  const [stage, setStage] = useState<'wait' | 'scan' | 'checking' | 'mismatch' | 'inconclusive' | 'camera-error' | 'done'>('wait');
  const [attempts, setAttempts] = useState(0); const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (!profile) return;
    if (!profile.face_registered) { nav('/face-setup', { replace: true }); return; }
    setStage('scan');
  }, [loading, user, profile]);

  const logAttempt = (photoUrl: string, matched: boolean, s: number | null) => {
    api('/api/login-verifications', { method: 'POST', body: JSON.stringify({ user_id: user.id, user_name: profile.full_name, photo_url: photoUrl, matched, score: s }) }).catch(() => {});
  };
  const awardDailyLogin = () => {
    api('/api/stats', { method: 'POST', body: JSON.stringify({ user_id: user.id, user_name: profile.full_name, avatar_url: profile.avatar_url, role: profile.role, action: 'daily_login' }) })
      .then((g: any) => { if (g?.xpAwarded) { toast.success(`+${g.xpAwarded} XP · welcome back! ${g.stats?.streak > 1 ? `🔥 ${g.stats.streak}-day streak` : ''}`); if (g.leveledUp) toast.success(`🎉 Level up! You're now level ${g.stats.level}`); (g.newBadges || []).forEach((key: string) => toast.success(`🏆 New badge unlocked: ${key.replace(/_/g, ' ')}`)); } })
      .catch(() => {});
  };

  const onCaptured = async (dataUrl: string) => {
    if (!dataUrl || stage === 'checking') return;
    setStage('checking');
    let photoUrl = '';
    try { photoUrl = await uploadDataUrl(dataUrl, 'login-check'); } catch {}
    const result = await bestFaceMatch(dataUrl, profile.face_images || []);
    setScore(result);
    if (result === null) {
      // Could not run the comparison at all (e.g. a registered photo failed
      // to load) — don't lock a legitimate user out over a technical
      // hiccup, but don't silently mark it "verified" either.
      logAttempt(photoUrl, false, null);
      awardDailyLogin();
      setStage('inconclusive');
      setTimeout(() => nav('/dashboard', { replace: true }), 1500);
      return;
    }
    const passed = result >= FACE_MATCH_THRESHOLD;
    logAttempt(photoUrl, passed, result);
    if (passed) { awardDailyLogin(); setStage('done'); setTimeout(() => nav('/dashboard', { replace: true }), 1100); }
    else { setAttempts(a => a + 1); setStage('mismatch'); }
  };

  const onCameraError = () => setStage('camera-error');
  const retry = () => { setStage('scan'); };
  const signOutAndLeave = async () => { await signOut(); nav('/login', { replace: true }); };

  if (stage === 'wait') return <div className="min-h-screen bg-slate-950 grid place-items-center text-white"><div className="text-center"><GraduationCap className="mx-auto animate-pulse text-indigo-400" size={34} /><p className="text-slate-400 text-sm mt-3">Signing you in…</p></div></div>;

  if (stage === 'checking') return <div className="min-h-screen bg-slate-950 grid place-items-center text-white"><div className="text-center"><ScanFace className="mx-auto animate-pulse text-teal-300" size={34} /><p className="text-slate-400 text-sm mt-3">Comparing your face to your registered profile…</p></div></div>;

  if (stage === 'done' || stage === 'inconclusive') return <div className="min-h-screen bg-slate-950 grid place-items-center text-white p-5"><div className="text-center"><span className="w-16 h-16 rounded-full bg-emerald-500/15 grid place-items-center mx-auto"><ShieldCheck className="text-emerald-400" size={30} /></span><h1 className="text-2xl font-extrabold mt-4">Welcome back, {profile?.full_name?.split(' ')[0]}!</h1><p className="text-slate-400 text-sm mt-1.5">{stage === 'done' ? 'Identity verified automatically.' : 'Could not fully verify your face this time.'} Taking you to your dashboard…</p></div></div>;

  if (stage === 'mismatch') return <div className="min-h-screen bg-slate-950 text-white grid place-items-center p-5"><div className="max-w-sm w-full text-center">
    <span className="w-16 h-16 rounded-full bg-rose-500/15 grid place-items-center mx-auto"><ShieldAlert className="text-rose-400" size={30} /></span>
    <h1 className="text-2xl font-extrabold mt-4">This doesn't look like {profile?.full_name?.split(' ')[0]}</h1>
    <p className="text-slate-400 text-sm mt-1.5 mb-5">The face we just captured doesn't match the face registered on this account{score != null ? ` (match ${Math.round(score * 100)}%, need ${Math.round(FACE_MATCH_THRESHOLD * 100)}%+)` : ''}. For everyone's safety, we can't continue until this is verified. Make sure you're signed into your own account and try again in good lighting.</p>
    <button onClick={retry} className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-2xl"><RefreshCw size={17} /> Try scanning again</button>
    <button onClick={signOutAndLeave} className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-2xl text-sm"><LogOut size={16} /> This isn't my account — sign out</button>
    <p className="text-[11px] text-slate-500 mt-4">Attempt {attempts} logged to this account's attendance record.</p>
  </div></div>;

  if (stage === 'camera-error') return <div className="min-h-screen bg-slate-950 text-white grid place-items-center p-5"><div className="max-w-sm w-full text-center">
    <ScanFace className="mx-auto text-amber-300" size={34} />
    <h1 className="text-2xl font-extrabold mt-3">Camera unavailable</h1>
    <p className="text-slate-400 text-sm mt-1.5 mb-5">We couldn't access a camera on this device to verify your face. You can continue without verification this time, or try again.</p>
    <button onClick={retry} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-2xl mb-3">Try again</button>
    <button onClick={() => { awardDailyLogin(); nav('/dashboard', { replace: true }); }} className="w-full text-sm text-slate-400 underline">Continue without camera</button>
  </div></div>;

  return <div className="min-h-screen bg-slate-950 text-white grid place-items-center p-5"><div className="max-w-sm w-full text-center">
    <ScanFace className="mx-auto text-teal-300" size={34} />
    <h1 className="text-2xl font-extrabold mt-3">Verifying it's you…</h1>
    <p className="text-slate-400 text-sm mt-1.5 mb-5">Your face is already registered on this account — hold still, we auto-detect and compare it against your registered photo automatically.</p>
    <div className="bg-white rounded-[2rem] p-5"><FaceCapture key={attempts} instruction="Auto-detecting your face…" onCapture={onCaptured} onError={onCameraError} /></div>
  </div></div>;
}
