import { useState, useEffect } from 'react';
import AuraScanCapture, { type AuraScanResult } from '../components/AuraScanCapture';
import { getAuraConfig, FACE_LOGIN_FLAG, type AuraConfig } from '../lib/aurascan';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, BookOpen, Presentation, ScanFace } from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth } from '../contexts/AuthContext';
import { playSignInSound, playErrorSound } from '../lib/sound';

export default function Auth() {
  const loc = useLocation(); const nav = useNavigate(); const { user } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(loc.pathname.includes('signup') ? 'signup' : 'login');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'student' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  const inp = 'w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
  useEffect(() => { if (user) nav('/face-check', { replace: true }); }, [user]);
  // AuraScan face sign-in (only shown when AuraScan is switched on and online).
  const [aura, setAura] = useState<AuraConfig | null>(null); const [faceMode, setFaceMode] = useState(false);
  useEffect(() => { getAuraConfig().then(c => { if (c.enabled) setAura(c); }); }, []);
  const submit = async (e: any) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (mode === 'signup' && !f.name.trim()) return setErr('Please enter your full name.');
    if (f.password.length < 6) return setErr('Password must be at least 6 characters.');
    setBusy(true);
    if (mode === 'signup') {
      localStorage.setItem('pending_profile', JSON.stringify({ full_name: f.name.trim(), role: f.role }));
      const { data, error } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password });
      setBusy(false);
      if (error) { playErrorSound(); return setErr(error.message); }
      playSignInSound();
      if (data.session) nav('/face-check'); else setMsg('Account created! Check your email to confirm, then sign in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
      setBusy(false); if (error) { playErrorSound(); setErr(error.message); } else { playSignInSound(); nav('/face-check'); }
    }
  };
  return <div className="min-h-screen grid lg:grid-cols-2 bg-white">
    <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900 text-white p-10">
      <Link to="/" className="flex items-center gap-2.5"><span className="w-10 h-10 rounded-2xl bg-white/15 grid place-items-center"><GraduationCap size={22} /></span><span className="font-extrabold text-xl">LearnLive</span></Link>
      <div><h1 className="text-4xl font-extrabold leading-tight">Your classroom is<br />waiting for you.</h1><p className="text-indigo-200 mt-3 max-w-md">Live lessons, face-verified attendance, assignments and grades — completely free for teachers and students everywhere.</p>
      <div className="mt-8 space-y-3 text-sm">{['Register your face once — attendance takes care of itself','Join live classes from any device, no app to install','Create unlimited classes with simple join codes'].map(t => <p key={t} className="flex gap-2.5"><ScanFace size={18} className="text-teal-300 shrink-0" />{t}</p>)}</div></div>
      <p className="text-xs text-indigo-300">Free forever · No credit card · 60 seconds to start</p>
    </div>
    <div className="flex items-center justify-center p-5 bg-[#fbfbfe]"><div className="w-full max-w-md">
      <Link to="/" className="lg:hidden flex items-center gap-2 mb-6"><span className="w-9 h-9 rounded-xl bg-indigo-600 grid place-items-center text-white"><GraduationCap size={20} /></span><span className="font-extrabold text-lg">LearnLive</span></Link>
      <h2 className="text-3xl font-extrabold">{mode === 'signup' ? 'Create your free account' : 'Welcome back'}</h2>
      <p className="text-slate-500 text-sm mt-1.5">{mode === 'signup' ? 'Teachers and students welcome. Free forever.' : 'Sign in to join your classes.'}</p>
      {err && <p className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">{err}</p>}
      {msg && <p className="mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">{msg}</p>}
      <form onSubmit={submit} className="mt-5 space-y-3.5">
        {mode === 'signup' && <>
          <div className="grid grid-cols-2 gap-3">{[{ v: 'teacher', l: 'I am a Teacher', i: Presentation }, { v: 'student', l: 'I am a Student', i: BookOpen }].map(r => <button type="button" key={r.v} onClick={() => setF({ ...f, role: r.v })} className={`border-2 rounded-2xl p-4 text-left transition ${f.role === r.v ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}><r.i size={22} className={f.role === r.v ? 'text-indigo-600' : 'text-slate-400'} /><span className="block font-bold text-sm mt-2">{r.l}</span></button>)}</div>
          <input className={inp} placeholder="Full name *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        </>}
        <input className={inp} type="email" required placeholder="Email address" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <input className={inp} type="password" required placeholder="Password (6+ characters)" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        <button disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200">{busy ? 'Please wait…' : mode === 'signup' ? 'Sign up — it is free' : 'Sign in'}</button>
      </form>
      <div className="flex items-center gap-3 my-5"><span className="flex-1 h-px bg-slate-200" /><span className="text-xs text-slate-400">or</span><span className="flex-1 h-px bg-slate-200" /></div>
      <button onClick={() => signInWithGoogle('LearnLive')} className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 font-bold py-3 rounded-xl text-sm">Continue with Google</button>
      {aura && mode === 'login' && !faceMode && <button onClick={() => setFaceMode(true)} className="w-full mt-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm inline-flex items-center justify-center gap-2" data-face-login><ScanFace size={17} /> Sign in with my face</button>}
      {aura && mode === 'login' && faceMode && <FaceLogin cfg={aura} email={f.email} onCancel={() => setFaceMode(false)} onSignedIn={() => { playSignInSound(); nav('/face-check'); }} />}
      <p className="text-center text-sm text-slate-500 mt-5">{mode === 'signup' ? <>Already have an account? <button className="font-bold text-indigo-700" onClick={() => setMode('login')}>Sign in</button></> : <>New to LearnLive? <button className="font-bold text-indigo-700" onClick={() => setMode('signup')}>Create a free account</button></>}</p>
    </div></div>
  </div>;
}

// Email + live AuraScan face scan -> signed in (no password needed).
// The face is matched 1:1 against THAT account only, on the AuraScan server.
function FaceLogin({ cfg, email: email0, onCancel, onSignedIn }: { cfg: AuraConfig; email: string; onCancel: () => void; onSignedIn: () => void }) {
  const [email, setEmail] = useState(email0 || ''); const [step, setStep] = useState<'email' | 'scan' | 'busy'>('email'); const [err, setErr] = useState(''); const [key, setKey] = useState(0);
  const go = (e: any) => { e.preventDefault(); setErr(''); if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Enter the email of your LearnLive account.'); setStep('scan'); setKey(k => k + 1); };
  const done = async (r: AuraScanResult) => {
    setStep('busy'); setErr('');
    try {
      const res = await fetch('/api/aurascan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email: email.trim(), challenge_id: r.challenge_id }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || 'Face sign-in is not available right now');
      if (!d?.verified) throw new Error(d?.reason || 'Face does not match this account');
      sessionStorage.setItem(FACE_LOGIN_FLAG, d.user_id || '');
      let { error } = await supabase.auth.verifyOtp({ token_hash: d.token_hash, type: 'magiclink' });
      if (error) ({ error } = await supabase.auth.verifyOtp({ token_hash: d.token_hash, type: 'email' }));
      if (error) { sessionStorage.removeItem(FACE_LOGIN_FLAG); throw new Error(error.message); }
      onSignedIn();
    } catch (e: any) { playErrorSound(); setErr(e.message); setStep('email'); }
  };
  return <div className="mt-4 border-2 border-slate-900 rounded-2xl p-4 bg-white" data-face-login-box>
    <div className="flex items-center justify-between"><p className="font-extrabold text-sm flex items-center gap-2"><ScanFace size={17} className="text-indigo-600" /> Sign in with your face</p><button onClick={onCancel} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Cancel</button></div>
    {err && <p className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</p>}
    {step === 'email' && <form onSubmit={go} className="mt-3 space-y-2.5"><input className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" type="email" placeholder="Your account email" value={email} onChange={e => setEmail(e.target.value)} /><button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm">Next: scan my face</button><p className="text-[11px] text-slate-400">Works after you have done the AuraScan live face scan on the Face Registration page.</p></form>}
    {step === 'scan' && <div className="mt-3"><AuraScanCapture key={key} cfg={cfg} title="Look at the camera" onDone={done} /></div>}
    {step === 'busy' && <p className="mt-3 text-sm text-indigo-700 font-semibold">Signing you in…</p>}
  </div>;
}
