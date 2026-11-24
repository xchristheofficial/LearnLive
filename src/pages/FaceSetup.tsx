import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanFace, Check, ShieldCheck, ChevronRight, RotateCcw, Sun, Glasses, Move } from 'lucide-react';
import FaceCapture from '../components/FaceCapture';
import { api, uploadDataUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
const POSES = [
  { key: 'front', title: 'Look straight ahead', tip: 'Center your face in the oval, eyes open, neutral expression.' },
  { key: 'left', title: 'Turn slightly left', tip: 'Turn your head a little to your left — keep both eyes visible.' },
  { key: 'right', title: 'Turn slightly right', tip: 'Now turn a little to your right — keep both eyes visible.' },
];
export default function FaceSetup() {
  const { profile, user, refreshProfile } = useAuth(); const nav = useNavigate();
  const [step, setStep] = useState(0); const [shots, setShots] = useState<any>({}); const [current, setCurrent] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState(''); const [redo, setRedo] = useState(false);
  const pose = POSES[step]; const allDone = POSES.every(p => shots[p.key]);
  const next = () => { if (!current) return; setShots({ ...shots, [pose.key]: current }); setCurrent(''); if (step < POSES.length - 1) setStep(step + 1); };
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const urls: string[] = [];
      for (const p of POSES) urls.push(await uploadDataUrl(shots[p.key] || current, `face-${p.key}`));
      await api('/api/profiles', { method: 'PUT', body: JSON.stringify({ id: user.id, face_registered: true, face_images: urls, avatar_url: profile?.avatar_url || urls[0] }) });
      await refreshProfile(); setDone(true);
    } catch (e: any) { setErr(e.message); } setBusy(false);
  };
  if (done) return <div className="max-w-2xl mx-auto text-center pt-10"><span className="w-20 h-20 rounded-full bg-emerald-100 grid place-items-center mx-auto"><ShieldCheck size={40} className="text-emerald-600" /></span><h1 className="text-3xl font-extrabold mt-5">Your face is registered</h1><p className="text-slate-500 mt-2">From now on, joining a live class takes one quick face check-in photo and your attendance is recorded automatically.</p><div className="flex justify-center gap-3 mt-5">{Object.values(shots).map((s: any, i) => <img key={i} src={s} className="w-24 h-24 rounded-2xl object-cover ring-2 ring-emerald-200" alt="Registered face pose" />)}</div><Link to="/dashboard" className="inline-block mt-7 bg-indigo-600 text-white font-bold px-6 py-3 rounded-full">Go to my dashboard →</Link></div>;
  if (profile?.face_registered && !redo) return <div className="max-w-3xl mx-auto"><h1 className="text-3xl font-extrabold flex items-center gap-2.5"><ScanFace className="text-indigo-600" size={30} /> Face Registration</h1>
    <div className="bg-white border border-emerald-200 rounded-3xl p-6 mt-5"><p className="font-extrabold text-emerald-700 flex items-center gap-2"><ShieldCheck /> Registered & ready</p><p className="text-sm text-slate-500 mt-1.5">These are the face photos on your account. Teachers see your live check-in photo beside these when reviewing attendance.</p>
    <div className="flex flex-wrap gap-3 mt-4">{(profile.face_images || []).map((u: string, i: number) => <img key={i} src={u} className="w-28 h-28 rounded-2xl object-cover" alt={`Face pose ${i+1}`} />)}</div>
    <button onClick={() => { setRedo(true); setShots({}); setStep(0); }} className="mt-5 inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-full text-sm"><RotateCcw size={16} /> Re-register my face</button></div>
    <PrivacyNote /></div>;
  return <div className="max-w-3xl mx-auto">
    <h1 className="text-3xl font-extrabold flex items-center gap-2.5"><ScanFace className="text-indigo-600" size={30} /> Register your face</h1>
    <p className="text-slate-500 mt-2">Three quick photos. Then every live class you join records your attendance with a face check-in — no registers to sign, no names called out.</p>
    <div className="flex items-center gap-2 mt-6">{POSES.map((p, i) => <span key={p.key} className="flex items-center gap-2 flex-1"><span className={`w-8 h-8 rounded-full grid place-items-center text-sm font-extrabold shrink-0 ${shots[p.key] ? 'bg-emerald-500 text-white' : i === step ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{shots[p.key] ? <Check size={16} /> : i + 1}</span><span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-indigo-700' : 'text-slate-400'}`}>{p.title}</span>{i < 2 && <span className="flex-1 h-0.5 bg-slate-200 rounded" />}</span>)}</div>
    <div className="grid md:grid-cols-5 gap-6 mt-6">
      <div className="md:col-span-3 bg-white border border-slate-200 rounded-[2rem] p-5">
        {!allDone ? <><h2 className="font-extrabold text-center">Step {step + 1}: {pose.title}</h2><p className="text-sm text-slate-500 text-center mt-1 mb-4">{pose.tip}</p><FaceCapture key={pose.key} instruction={pose.title} onCapture={(u: string) => setCurrent(u)} />
        <button disabled={!current} onClick={next} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl inline-flex justify-center items-center gap-1">{step === POSES.length - 1 ? 'Use this photo' : 'Use this photo — next pose'} <ChevronRight size={17} /></button></>
        : <><h2 className="font-extrabold text-center">Review your photos</h2><div className="flex justify-center gap-3 mt-4">{POSES.map(p => <figure key={p.key} className="text-center"><img src={shots[p.key]} className="w-28 h-28 rounded-2xl object-cover" alt={p.title} /><figcaption className="text-[11px] text-slate-400 mt-1 capitalize">{p.key}</figcaption></figure>)}</div>
        {err && <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2 mt-4">{err}</p>}
        <button disabled={busy} onClick={save} className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl">{busy ? 'Saving your face profile…' : 'Save my face registration'}</button><button onClick={() => { setShots({}); setStep(0); setCurrent(''); }} className="w-full mt-2 text-sm font-semibold text-slate-500 py-2">Start over</button></>}
      </div>
      <div className="md:col-span-2 space-y-3">
        {[{ i: Sun, t: 'Good light', d: 'Face a window or lamp. Avoid bright light behind you.' }, { i: Move, t: 'Fill the oval', d: 'Move closer until your face fills the guide. Hold still for the photo.' }, { i: Glasses, t: 'Be yourself', d: 'Wear what you normally wear in class. No hats or sunglasses, please.' }].map(x => <div key={x.t} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3"><span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 grid place-items-center shrink-0"><x.i size={20} /></span><span><span className="block font-bold text-sm">{x.t}</span><span className="text-xs text-slate-500">{x.d}</span></span></div>)}
        <PrivacyNote compact />
        <button onClick={() => nav('/dashboard')} className="text-sm font-semibold text-slate-400 hover:text-slate-600 px-1">Skip for now — I will do this later</button>
      </div>
    </div>
  </div>;
}
function PrivacyNote({ compact }: any) {
  return <div className={`bg-slate-50 border border-slate-200 rounded-2xl p-4 ${compact ? '' : 'mt-5'}`}><p className="font-bold text-sm flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Your privacy</p><p className="text-xs text-slate-500 mt-1 leading-relaxed">Face photos are stored only on your LearnLive account and shown to teachers of classes you attend, next to your attendance. They are never sold or used for ads. You can replace them anytime here. Your camera is only used when you press the button — the browser always asks permission first.</p></div>;
}
