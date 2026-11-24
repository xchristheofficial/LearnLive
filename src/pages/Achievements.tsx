import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, Lock, Crown } from 'lucide-react';
import { api, initials } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { BADGE_CATALOG } from '../lib/badges';

export default function Achievements() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<any>(null); const [board, setBoard] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; setLoading(true); Promise.all([api(`/api/stats?user_id=${user.id}`), api('/api/stats?leaderboard=true&limit=20')]).then(([s, b]) => { setStats(s); setBoard(b || []); }).finally(() => setLoading(false)); }, [user?.id]);
  if (loading || !stats) return <p className="text-slate-400 text-sm">Loading achievements…</p>;
  const pct = stats.xp_for_next_level ? Math.min(100, Math.round((stats.xp_into_level / stats.xp_for_next_level) * 100)) : 0;
  const earnedKeys = new Set((stats.badges || []).map((b: any) => b.badge_key));
  const myRank = board.findIndex(r => r.user_id === user.id);
  return <div>
    <h1 className="text-3xl font-extrabold flex items-center gap-2.5"><Trophy className="text-amber-500" size={30} /> Achievements</h1>
    <p className="text-slate-500 mt-1">Earn XP by attending live classes, submitting work and keeping your streak alive.</p>

    <div className="grid sm:grid-cols-3 gap-4 mt-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-3xl p-5 sm:col-span-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/15 px-2.5 py-1 rounded-full"><Trophy size={13} /> Level {stats.level}</span>
        <p className="text-3xl font-extrabold mt-3">{stats.xp} <span className="text-base font-bold text-indigo-200">XP</span></p>
        <div className="mt-3 h-2 w-full bg-white/20 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} className="h-full bg-white rounded-full" /></div>
        <p className="text-xs text-indigo-200 mt-1.5">{stats.xp_into_level}/{stats.xp_for_next_level} XP to level {stats.level + 1}</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-white border border-slate-200 rounded-3xl p-5">
        <span className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 grid place-items-center"><Flame size={22} /></span>
        <p className="text-3xl font-extrabold mt-3">{stats.streak}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Day streak · best {stats.longest_streak}</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="bg-white border border-slate-200 rounded-3xl p-5">
        <span className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 grid place-items-center"><Crown size={22} /></span>
        <p className="text-3xl font-extrabold mt-3">{myRank >= 0 ? `#${myRank + 1}` : '—'}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Your global rank</p>
      </motion.div>
    </div>

    <h2 className="font-extrabold text-xl mt-9">Badges</h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
      {Object.entries(BADGE_CATALOG).map(([key, b], i) => { const earned = earnedKeys.has(key); const Icon = b.icon; return (
        <motion.div key={key} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} className={`rounded-3xl p-5 border text-center ${earned ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
          <span className={`w-14 h-14 rounded-2xl grid place-items-center mx-auto ${earned ? b.color : 'bg-slate-200 text-slate-400'}`}>{earned ? <Icon size={26} /> : <Lock size={22} />}</span>
          <p className="font-extrabold text-sm mt-3">{b.title}</p>
          <p className="text-xs text-slate-500 mt-1">{b.desc}</p>
        </motion.div>
      ); })}
    </div>

    <h2 className="font-extrabold text-xl mt-9 flex items-center gap-2"><Trophy size={20} className="text-amber-500" /> Global leaderboard</h2>
    <div className="bg-white border border-slate-200 rounded-3xl mt-4 divide-y divide-slate-100">
      {board.length === 0 ? <p className="text-sm text-slate-400 p-5">No activity yet — be the first to earn XP!</p> : board.map((r, i) => (
        <div key={r.user_id} className={`flex items-center gap-3 px-5 py-3.5 ${r.user_id === user.id ? 'bg-indigo-50/60' : ''}`}>
          <span className={`w-8 h-8 rounded-full grid place-items-center font-extrabold text-sm shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber-700/70 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
          {r.avatar_url ? <img src={r.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" /> : <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center font-bold text-xs shrink-0">{initials(r.full_name)}</span>}
          <span className="flex-1 min-w-0"><span className="block font-bold text-sm truncate">{r.full_name}{r.user_id === user.id ? ' (you)' : ''}</span><span className="block text-[11px] text-slate-400">Level {r.level} · {r.streak}d streak</span></span>
          <span className="inline-flex items-center gap-1 text-sm font-extrabold text-indigo-700"><Zap size={14} /> {r.xp}</span>
        </div>
      ))}
    </div>
  </div>;
}
