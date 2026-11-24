import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Trophy, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Compact level / XP / streak widget shown on the dashboard sidebar and
// profile page. Links through to the full Achievements page.
export default function XPWidget({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { if (user) api(`/api/stats?user_id=${user.id}`).then(setStats).catch(() => {}); }, [user?.id]);
  if (!stats) return null;
  const pct = stats.xp_for_next_level ? Math.min(100, Math.round((stats.xp_into_level / stats.xp_for_next_level) * 100)) : 0;
  return (
    <Link to="/achievements" className={`block rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-extrabold text-sm"><Trophy size={16} className="text-amber-500" /> Level {stats.level}</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full"><Flame size={13} /> {stats.streak}d streak</span>
      </div>
      <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1"><Zap size={12} className="text-indigo-500" /> {stats.xp_into_level}/{stats.xp_for_next_level} XP to level {stats.level + 1} · {stats.xp} XP total</p>
    </Link>
  );
}
