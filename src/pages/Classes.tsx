import { useEffect, useState } from 'react';
import { Plus, Hash, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ClassCard, CreateClassModal, JoinClassModal } from '../components/ClassModals';
export default function Classes() {
  const { profile, user } = useAuth(); const [classes, setClasses] = useState<any[]>([]); const [all, setAll] = useState<any[]>([]); const [q, setQ] = useState(''); const [loading, setLoading] = useState(true); const [modal, setModal] = useState(''); const [err, setErr] = useState('');
  const load = async () => { if (!user) return; setLoading(true); try { const [mine, every] = await Promise.all([api(`/api/classes?user_id=${user.id}`), api('/api/classes')]); setClasses(mine || []); setAll(every || []); } catch (e: any) { setErr(e.message); } setLoading(false); };
  useEffect(() => { load(); }, [user?.id]);
  const myIds = new Set(classes.map(c => c.id)); const discover = all.filter(c => !myIds.has(c.id) && (c.title + c.subject + c.teacher_name).toLowerCase().includes(q.toLowerCase()));
  const joinDirect = async (c: any) => { try { await api('/api/enrollments', { method: 'POST', body: JSON.stringify({ class_id: c.id, user_id: user.id, user_name: profile?.full_name, role: profile?.role || 'student' }) }); load(); } catch (e: any) { setErr(e.message); } };
  return <div>
    <div className="flex flex-wrap justify-between items-end gap-3"><div><h1 className="text-3xl font-extrabold">My Classes</h1><p className="text-slate-500 mt-1">Classes you teach or are enrolled in.</p></div><div className="flex gap-2">{profile?.role === 'teacher' && <button onClick={() => setModal('create')} className="inline-flex gap-2 items-center bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-full text-sm"><Plus size={17} /> Create class</button>}<button onClick={() => setModal('join')} className="inline-flex gap-2 items-center bg-white border-2 border-slate-200 font-bold px-4 py-2.5 rounded-full text-sm"><Hash size={16} /> Join with code</button></div></div>
    {err && <p className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{err}</p>}
    {loading ? <p className="text-slate-400 text-sm mt-8">Loading classes…</p> : classes.length === 0 ? <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center mt-6"><p className="font-extrabold text-lg">You are not in any classes yet</p><p className="text-sm text-slate-500 mt-1">Join one below with a single click, or use a join code from your teacher.</p></div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">{classes.map(c => <ClassCard key={c.id} c={c} profile={profile} />)}</div>}
    <h2 className="font-extrabold text-2xl mt-12">Discover open classes</h2><p className="text-slate-500 text-sm mt-1">Free to join — click Enroll and you are in.</p>
    <div className="relative mt-4 max-w-md"><Search size={18} className="absolute left-3.5 top-3 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by topic, subject or teacher…" className="w-full bg-white border border-slate-300 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">{discover.map(c => <div key={c.id} className="relative"><ClassCard c={c} profile={profile} /><button onClick={(e) => { e.preventDefault(); joinDirect(c); }} className="absolute bottom-4 right-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3.5 py-2 rounded-full shadow">Enroll free</button></div>)}{!loading && discover.length === 0 && <p className="text-slate-400 text-sm">No other classes found{q ? ' for that search' : ''}.</p>}</div>
    {modal === 'create' && <CreateClassModal onClose={() => setModal('')} onDone={load} />}{modal === 'join' && <JoinClassModal onClose={() => setModal('')} onDone={load} />}
  </div>;
}
