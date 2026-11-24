import { Rocket, Users as Users2, Flame, Star, GraduationCap, ShieldCheck, ClipboardCheck, Trophy } from 'lucide-react';

// Mirrors the badge keys/titles defined server-side in api/_gamification.js
// so the frontend can render icons, colors and friendly descriptions
// without needing a database-backed catalog table.
export const BADGE_CATALOG: Record<string, { title: string; desc: string; icon: any; color: string }> = {
  first_class: { title: 'First Steps', desc: 'Joined your first live class', icon: Rocket, color: 'bg-indigo-100 text-indigo-700' },
  classes_10: { title: 'Regular', desc: 'Attended 10 live classes', icon: Users2, color: 'bg-sky-100 text-sky-700' },
  streak_3: { title: 'On a Roll', desc: '3-day activity streak', icon: Flame, color: 'bg-orange-100 text-orange-700' },
  streak_7: { title: 'Week Warrior', desc: '7-day activity streak', icon: Flame, color: 'bg-amber-100 text-amber-700' },
  streak_30: { title: 'Unstoppable', desc: '30-day activity streak', icon: Flame, color: 'bg-rose-100 text-rose-700' },
  xp_500: { title: 'Rising Star', desc: 'Earned 500 XP', icon: Star, color: 'bg-violet-100 text-violet-700' },
  xp_2000: { title: 'Scholar', desc: 'Earned 2,000 XP', icon: GraduationCap, color: 'bg-emerald-100 text-emerald-700' },
  xp_5000: { title: 'Legend', desc: 'Earned 5,000 XP', icon: Trophy, color: 'bg-yellow-100 text-yellow-700' },
  face_verified_10: { title: 'Trusted Face', desc: '10 face-verified check-ins', icon: ShieldCheck, color: 'bg-teal-100 text-teal-700' },
  submissions_10: { title: 'Homework Hero', desc: 'Submitted 10 assignments', icon: ClipboardCheck, color: 'bg-fuchsia-100 text-fuchsia-700' },
  perfect_score: { title: 'Perfectionist', desc: 'Scored 100% on an assignment', icon: Trophy, color: 'bg-rose-100 text-rose-700' },
};
