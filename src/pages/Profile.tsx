import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanFace, BadgeCheck, LogOut, Save } from 'lucide-react';
import { api, initials } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import XPWidget from '../components/XPWidget';
export default function Profile() {
  const { profile, user, refreshProfile, signOut } = useAuth(); const nav = useNavigate();
  const [name, setName] = useState(''); const [role, setRole] = useState('student'); const [bio, setBio] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) { setName(profile.full_name || ''); setRole(profile.role || 'student'); setBio(profile.bio || ''); } }, [profile?.id]);
  const save = async (e: any) => { e.preventDefault(); setBusy(true); setMsg(''); try { await api('/api/profiles', { method: 'PUT', body: JSON.stringify({ id: user.id, full_name: name.trim(), role, bio }) }); await refreshProfile(); setMsg('Profile saved.'); } catch (x: any) { setMsg(x.message); } setBusy(false); };
  const setAvatar = async (url: string) => { await api('/api/profiles', { method: 'PUT', body: JSON.stringify({ id: user.id, avatar_url: url }) }); refreshProfile(); };
  const inp = 'w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
  if (!profile) return <p className="text-slate-400 text-sm">Loading profile…</p>;
  return <div className="max-w-3xl mx-auto">
    <h1 className="text-3xl font-extrabold">My Profile</h1>
    <div className="bg-white border border-slate-200 rounded-3xl p-6 mt-5 flex flex-wrap items-center gap-5">
      {profile.avatar_url ? <img src={profile.avatar_url} className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-100" alt="Your photo" /> : <span className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-3xl font-extrabold">{initials(profile.full_name)}</span>}
      <div><h2 className="font-extrabold text-2xl">{profile.full_name}</h2><p className="text-slate-500 text-sm">{profile.email}</p><p className="mt-2 flex flex-wrap gap-2"><span className="text-xs font-bold bg-indigo-100 text-indigo-700 capitalize px-2.5 py-1 rounded-full">{profile.role}</span>{profile.face_registered ? <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full inline-flex items-center gap-1"><BadgeCheck size={13} /> Face registered</span> : <Link to="/face-setup" className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Face not registered — set up →</Link>}</p></div>
    </div>
    <div className="mt-5"><XPWidget /></div>
    <form onSubmit={save} className="bg-white border border-slate-200 rounded-3xl p-6 mt-5 space-y-4">
      <h3 className="font-extrabold">Edit details</h3>
      <div><label className="text-sm font-semibold text-slate-600">Full name</label><input className={inp + ' mt-1'} value={name} onChange={e => setName(e.target.value)} /></div>
      <div><label className="text-sm font-semibold text-slate-600">I am a…</label><div className="grid grid-cols-2 gap-3 mt-1.5">{['teacher','student'].map(r => <button type="button" key={r} onClick={() => setRole(r)} className={`border-2 rounded-xl py-2.5 font-bold text-sm capitalize ${role === r ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>{r}</button>)}</div><p className="text-xs text-slate-400 mt-1.5">Teachers can create classes; students join with codes. You can switch anytime.</p></div>
      <div><label className="text-sm font-semibold text-slate-600">About me</label><textarea className={inp + ' mt-1'} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Subjects you teach or love, your school, your goals…" /></div>
      {msg && <p className="text-sm bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2">{msg}</p>}
      <button disabled={busy} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-full text-sm"><Save size={16} /> {busy ? 'Saving…' : 'Save changes'}</button>
    </form>
    <div className="bg-white border border-slate-200 rounded-3xl p-6 mt-5"><h3 className="font-extrabold flex items-center gap-2"><ScanFace className="text-indigo-600" /> My registered face photos</h3>
      {(profile.face_images || []).length ? <><div className="flex flex-wrap gap-3 mt-4">{profile.face_images.map((u: string, i: number) => <button key={i} onClick={() => setAvatar(u)} title="Use as profile photo" className="relative group"><img src={u} className="w-24 h-24 rounded-2xl object-cover" alt={`Face ${i+1}`} /><span className="absolute inset-0 bg-black/50 text-white text-[11px] font-bold grid place-items-center rounded-2xl opacity-0 group-hover:opacity-100">Use as photo</span></button>)}</div><Link to="/face-setup" className="inline-block mt-4 text-sm font-bold text-indigo-700">Re-register my face →</Link></> : <p className="text-sm text-slate-500 mt-2">No face photos yet. <Link to="/face-setup" className="font-bold text-indigo-700">Register your face</Link> to enable face-verified attendance.</p>}
    </div>
    <button onClick={async () => { await signOut(); nav('/'); }} className="mt-6 inline-flex items-center gap-2 text-rose-600 font-bold text-sm bg-rose-50 border border-rose-200 px-5 py-2.5 rounded-full"><LogOut size={16} /> Sign out</button>
  </div>;
}
