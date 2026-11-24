import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, LayoutDashboard, BookOpen, CalendarDays, ScanFace, UserRound, LogOut, Video, Menu, X, BadgeCheck, Trophy, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { initials } from '../lib/api';
import { useState } from 'react';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import CommandPalette from './CommandPalette';
const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/classes', label: 'My Classes', icon: BookOpen },
  { to: '/schedule', label: 'Schedule & Live', icon: CalendarDays },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
  { to: '/face-setup', label: 'Face Registration', icon: ScanFace },
  { to: '/profile', label: 'My Profile', icon: UserRound },
];
export default function Layout() {
  const { profile, signOut } = useAuth(); const nav = useNavigate(); const [open, setOpen] = useState(false);
  const out = async () => { await signOut(); nav('/'); };
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || navigator.userAgent);
  const Sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-5"><Link to="/dashboard" className="flex items-center gap-2.5"><span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 grid place-items-center text-white shadow-lg shadow-indigo-200"><GraduationCap size={22} /></span><span><span className="font-extrabold text-lg tracking-tight block leading-none dark:text-white">LearnLive</span><span className="text-[11px] text-slate-400 font-medium">Learn together · Free</span></span></Link><span className="flex items-center gap-0.5"><ThemeToggle /><NotificationBell /></span></div>
      <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))} className="mx-3 mb-2 flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:border-indigo-300 transition-colors"><Search size={15} /><span className="text-xs font-semibold flex-1 text-left">Quick search…</span><kbd className="text-[10px] font-bold bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">{isMac ? '⌘K' : 'Ctrl K'}</kbd></button>
      <nav className="px-3 space-y-1 mt-1">{links.map((l, i) => <motion.div key={l.to} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, duration: 0.25 }}><NavLink to={l.to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:translate-x-0.5'}`}><l.icon size={19} />{l.label}{l.to === '/face-setup' && (profile?.face_registered ? <BadgeCheck size={16} className="ml-auto text-emerald-500" /> : <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">SET UP</span>)}</NavLink></motion.div>)}</nav>
      <div className="mx-3 mt-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-4"><Video size={20} className="mb-2" /><p className="font-bold text-sm">Go live in seconds</p><p className="text-xs text-indigo-100 mt-1">Open a class and start a live session — no installs, no cost.</p><Link to="/schedule" onClick={() => setOpen(false)} className="inline-block mt-3 bg-white text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full">View schedule →</Link></div>
      <div className="mt-auto p-4 border-t border-slate-100 dark:border-white/10"><div className="flex items-center gap-3">{profile?.avatar_url ? <img src={profile.avatar_url} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-100" alt="" /> : <span className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center font-bold">{initials(profile?.full_name || 'U')}</span>}<span className="min-w-0 flex-1"><span className="block font-bold text-sm truncate dark:text-white">{profile?.full_name || 'Loading…'}</span><span className="block text-xs capitalize text-slate-400">{profile?.role || ''} {profile?.face_registered ? '· Face verified' : ''}</span></span><button onClick={out} title="Sign out" className="text-slate-400 hover:text-rose-600 p-1"><LogOut size={18} /></button></div></div>
    </div>
  );
  return (
    <div className="min-h-screen bg-[#f6f7fb] dark:bg-slate-950 flex">
      <CommandPalette />
      <aside className="hidden md:flex w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/70 dark:border-white/10 sticky top-0 h-screen flex-col">{Sidebar}</aside>
      <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)}><motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 340, damping: 32 }} className="w-72 h-full bg-white dark:bg-slate-900" onClick={e => e.stopPropagation()}>{Sidebar}</motion.aside></motion.div>}</AnimatePresence>
      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b dark:border-white/10 px-4 py-3 flex items-center justify-between"><button onClick={() => setOpen(true)} className="p-1"><Menu className="dark:text-white" /></button><span className="font-extrabold dark:text-white">LearnLive</span><span className="flex items-center gap-0.5"><ThemeToggle /><NotificationBell /></span></header>
        <main className="p-4 sm:p-7 max-w-7xl mx-auto w-full"><Outlet /></main>
      </div>
    </div>
  );
}
