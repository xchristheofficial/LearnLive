import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, BookOpen, CalendarDays, ScanFace, UserRound, Trophy, Plus, Hash, Moon, Sun, CornerDownLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface Item { id: string; label: string; sub?: string; icon: any; action: () => void; group: string; }

// Global Cmd+K / Ctrl+K quick-search and command launcher. Mounted once in
// the app Layout; searches across pages, your classes, and theme/quick
// actions without needing a page reload.
export default function CommandPalette() {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [classes, setClasses] = useState<any[]>([]); const [active, setActive] = useState(0);
  const nav = useNavigate(); const { user, profile } = useAuth(); const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open && user) api(`/api/classes?user_id=${user.id}`).then(d => setClasses(d || [])).catch(() => {}); }, [open, user?.id]);
  useEffect(() => { setActive(0); }, [q, open]);

  const items: Item[] = useMemo(() => {
    const nav_: Item[] = [
      { id: 'dash', label: 'Go to Dashboard', icon: LayoutDashboard, group: 'Navigate', action: () => nav('/dashboard') },
      { id: 'classes', label: 'My Classes', icon: BookOpen, group: 'Navigate', action: () => nav('/classes') },
      { id: 'schedule', label: 'Schedule & Live', icon: CalendarDays, group: 'Navigate', action: () => nav('/schedule') },
      { id: 'face', label: 'Face Registration', icon: ScanFace, group: 'Navigate', action: () => nav('/face-setup') },
      { id: 'achievements', label: 'Achievements & Leaderboard', icon: Trophy, group: 'Navigate', action: () => nav('/achievements') },
      { id: 'profile', label: 'My Profile', icon: UserRound, group: 'Navigate', action: () => nav('/profile') },
    ];
    const actions: Item[] = [
      { id: 'theme', label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', icon: theme === 'dark' ? Sun : Moon, group: 'Quick actions', action: toggleTheme },
      { id: 'join', label: 'Join a class with a code', icon: Hash, group: 'Quick actions', action: () => nav('/classes') },
    ];
    if (profile?.role === 'teacher') actions.push({ id: 'create', label: 'Create a new class', icon: Plus, group: 'Quick actions', action: () => nav('/classes') });
    const classItems: Item[] = classes.map(c => ({ id: 'class-' + c.id, label: c.title, sub: c.subject, icon: BookOpen, group: 'My classes', action: () => nav(`/classes/${c.id}`) }));
    const all = [...nav_, ...classItems, ...actions];
    if (!q.trim()) return all;
    const needle = q.toLowerCase();
    return all.filter(i => i.label.toLowerCase().includes(needle) || i.sub?.toLowerCase().includes(needle));
  }, [q, classes, theme, profile?.role]);

  const run = (item: Item) => { item.action(); setOpen(false); setQ(''); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={() => setOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            onClick={(e: any) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-white/10">
              <Search size={18} className="text-slate-400" />
              <input
                autoFocus value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); } if (e.key === 'Enter' && items[active]) run(items[active]); }}
                placeholder="Search classes, pages, actions…"
                className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <kbd className="hidden sm:inline text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin py-2">
              {items.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No matches — try a different search.</p> : (() => {
                let lastGroup = '';
                return items.map((item, i) => {
                  const showGroup = item.group !== lastGroup; lastGroup = item.group;
                  return <div key={item.id}>
                    {showGroup && <p className="px-4 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{item.group}</p>}
                    <button
                      onMouseEnter={() => setActive(i)} onClick={() => run(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm ${i === active ? 'bg-indigo-50 dark:bg-white/10 text-indigo-700 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      <item.icon size={16} className="shrink-0" />
                      <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{item.label}</span>{item.sub && <span className="block text-[11px] text-slate-400 truncate">{item.sub}</span>}</span>
                      {i === active && <CornerDownLeft size={13} className="text-slate-400 shrink-0" />}
                    </button>
                  </div>;
                });
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
