import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Plus, BookOpen } from 'lucide-react';
import { api, COLORS } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export function ClassCard({ c, profile }: any) {
  const isMine = c.teacher_id === profile?.id;
  return <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
    <Link to={`/classes/${c.id}`} className="group block bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-shadow">
      <div className={`h-24 bg-gradient-to-r ${COLORS[c.cover_color] || COLORS.indigo} p-4 flex items-start justify-between`}><span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur">{c.subject}</span><span className="bg-black/25 text-white text-[11px] font-mono px-2 py-1 rounded-lg inline-flex items-center gap-1"><Hash size={11} />{c.join_code}</span></div>
      <div className="p-5"><h3 className="font-extrabold text-lg leading-tight group-hover:text-indigo-700 transition-colors">{c.title}</h3><p className="text-sm text-slate-500 mt-1 line-clamp-2 min-h-[40px]">{c.description || 'No description yet.'}</p>
      <div className="flex items-center justify-between mt-4 text-xs text-slate-500"><span>Teacher: <b className="text-slate-700">{isMine ? 'You' : c.teacher_name}</b></span><span className="font-semibold text-indigo-600 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">Open class →</span></div></div>
    </Link>
  </motion.div>;
}

function ModalShell({ onClose, children, maxW = 'max-w-lg' }: any) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
        onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
      >
        <motion.div
          onClick={(e: any) => e.stopPropagation()}
          className={`bg-white rounded-3xl w-full ${maxW} p-6 shadow-2xl`}
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function CreateClassModal({ onClose, onDone }: any) {
  const { profile, user } = useAuth();
  const [f, setF] = useState({ title: '', subject: 'Mathematics', description: '', schedule: '', cover_color: 'indigo' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e: any) => { e.preventDefault(); if (!f.title.trim()) return setErr('Give your class a title.'); setBusy(true); try { await api('/api/classes', { method: 'POST', body: JSON.stringify({ ...f, teacher_id: user.id, teacher_name: profile?.full_name || 'Teacher' }) }); onDone(); onClose(); } catch (x: any) { setErr(x.message); } setBusy(false); };
  const inp = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-shadow';
  return <ModalShell onClose={onClose}>
    <form onSubmit={submit}>
      <div className="flex justify-between items-center mb-4"><h2 className="font-extrabold text-xl flex items-center gap-2"><Plus className="text-indigo-600" /> Create a class</h2><motion.button whileTap={{ scale: 0.85, rotate: 90 }} type="button" onClick={onClose}><X /></motion.button></div>
      <AnimatePresence>{err && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3 overflow-hidden">{err}</motion.p>}</AnimatePresence>
      <div className="space-y-3">
        <input className={inp} placeholder="Class title — e.g. Algebra for Beginners *" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3"><select className={inp} value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })}>{['Mathematics','English','Science','History','Art','Music','Coding','Languages','Business','General'].map(s => <option key={s}>{s}</option>)}</select>
        <select className={inp} value={f.cover_color} onChange={e => setF({ ...f, cover_color: e.target.value })}>{Object.keys(COLORS).map(c => <option key={c} value={c}>{c[0].toUpperCase()+c.slice(1)} theme</option>)}</select></div>
        <input className={inp} placeholder="Schedule — e.g. Mon & Wed, 4:00 PM" value={f.schedule} onChange={e => setF({ ...f, schedule: e.target.value })} />
        <textarea className={inp} rows={3} placeholder="What will students learn in this class?" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
      </div>
      <p className="text-xs text-slate-400 mt-3">A join code is created automatically — share it with your students so they can enroll free.</p>
      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} disabled={busy} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl">{busy ? 'Creating…' : 'Create class'}</motion.button>
    </form>
  </ModalShell>;
}

export function JoinClassModal({ onClose, onDone }: any) {
  const { profile, user } = useAuth(); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState<any>(null);
  const submit = async (e: any) => { e.preventDefault(); setBusy(true); setErr(''); try { const r = await api('/api/enrollments', { method: 'POST', body: JSON.stringify({ join_code: code, user_id: user.id, user_name: profile?.full_name || 'Student', role: profile?.role || 'student' }) }); setOk(r); onDone(); } catch (x: any) { setErr(x.message); } setBusy(false); };
  return <ModalShell onClose={onClose} maxW="max-w-md">
    <div className="flex justify-between items-center mb-4"><h2 className="font-extrabold text-xl flex items-center gap-2"><BookOpen className="text-teal-600" /> Join a class</h2><motion.button whileTap={{ scale: 0.85, rotate: 90 }} onClick={onClose}><X /></motion.button></div>
    <AnimatePresence mode="wait">
      {ok ? <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="text-center py-4"><p className="font-bold text-emerald-600 text-lg">You are enrolled{ok.already ? ' (already joined)' : ''}!</p><p className="text-slate-500 text-sm mt-1">{ok.class?.title || 'Find it in My Classes.'}</p>{ok.class && <Link to={`/classes/${ok.class.id}`} className="inline-block mt-4 bg-teal-600 text-white font-bold px-5 py-2.5 rounded-full">Open class →</Link>}</motion.div>
      : <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={submit}>
        <AnimatePresence>{err && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3 overflow-hidden">{err}</motion.p>}</AnimatePresence>
        <label className="text-sm font-semibold text-slate-600">Enter the code from your teacher</label>
        <input autoFocus className="w-full mt-1.5 border border-slate-300 rounded-xl px-4 py-3 text-lg font-mono uppercase tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow" placeholder="e.g. MATH101" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
        <p className="text-xs text-slate-400 mt-2">Ask your teacher for their class join code — it's shown on their class page.</p>
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} disabled={busy || code.length < 4} className="w-full mt-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl">{busy ? 'Joining…' : 'Join class'}</motion.button>
      </motion.form>}
    </AnimatePresence>
  </ModalShell>;
}
