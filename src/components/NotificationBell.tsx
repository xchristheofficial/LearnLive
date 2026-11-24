import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Megaphone, ClipboardList, Star, Video, UserPlus, CheckCheck } from 'lucide-react';
import { api, fmtDate } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
const ICONS: any = { announcement: Megaphone, assignment: ClipboardList, grade: Star, live: Video, join: UserPlus };

export default function NotificationBell() {
  const { user } = useAuth(); const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]); const [open, setOpen] = useState(false); const ref = useRef<any>(null);
  const load = async () => { if (!user) return; try { const d = await api(`/api/notifications?user_id=${user.id}`); setItems(d || []); } catch {} };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [user?.id]);
  useEffect(() => { const onDoc = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc); }, []);
  const unread = items.filter(i => !i.read).length;
  const openItem = async (n: any) => { if (!n.read) { api('/api/notifications', { method: 'PUT', body: JSON.stringify({ id: n.id }) }).catch(() => {}); setItems(items.map(i => i.id === n.id ? { ...i, read: true } : i)); } setOpen(false); if (n.link) nav(n.link); };
  const markAll = async () => { if (!user) return; await api('/api/notifications', { method: 'PUT', body: JSON.stringify({ mark_all: true, user_id: user.id }) }).catch(() => {}); setItems(items.map(i => ({ ...i, read: true }))); };
  return <div className="relative" ref={ref}>
    <motion.button whileTap={{ scale: 0.88 }} onClick={() => setOpen(o => !o)} className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500">
      <motion.span animate={unread > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}} transition={{ duration: 0.5, repeat: unread > 0 ? Infinity : 0, repeatDelay: 3.5 }} className="block"><Bell size={20} /></motion.span>
      <AnimatePresence>{unread > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold grid place-items-center">{unread > 9 ? '9+' : unread}</motion.span>}</AnimatePresence>
    </motion.button>
    <AnimatePresence>
      {open && <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="absolute right-0 mt-2 w-80 max-w-[85vw] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden origin-top-right"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100"><span className="font-extrabold text-sm">Notifications</span>{unread > 0 && <button onClick={markAll} className="text-xs font-bold text-indigo-600 inline-flex items-center gap-1"><CheckCheck size={13} /> Mark all read</button>}</div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">{items.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">You're all caught up — nothing here yet.</p> : items.map((n, i) => { const I = ICONS[n.type] || Bell; return <motion.button key={n.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }} onClick={() => openItem(n)} className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-indigo-50/50' : ''}`}><span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${!n.read ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}><I size={16} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold truncate">{n.title}</span>{n.body && <span className="block text-xs text-slate-500 line-clamp-2 mt-0.5">{n.body}</span>}<span className="block text-[11px] text-slate-400 mt-1">{fmtDate(n.created_at)}</span></span>{!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />}</motion.button>; })}</div>
      </motion.div>}
    </AnimatePresence>
  </div>;
}
