// Shared gamification helpers imported by other API routes (attendance,
// submissions, stats). Not meant to be hit directly as an endpoint — same
// pattern as db-client.js / db-wake.js.
export const BADGE_DEFS = [
  { key: 'first_class', title: 'First Steps', check: s => s.classes_attended >= 1 },
  { key: 'classes_10', title: 'Regular', check: s => s.classes_attended >= 10 },
  { key: 'streak_3', title: 'On a Roll', check: s => s.streak >= 3 },
  { key: 'streak_7', title: 'Week Warrior', check: s => s.streak >= 7 },
  { key: 'streak_30', title: 'Unstoppable', check: s => s.streak >= 30 },
  { key: 'xp_500', title: 'Rising Star', check: s => s.xp >= 500 },
  { key: 'xp_2000', title: 'Scholar', check: s => s.xp >= 2000 },
  { key: 'xp_5000', title: 'Legend', check: s => s.xp >= 5000 },
  { key: 'face_verified_10', title: 'Trusted Face', check: s => s.face_verified_count >= 10 },
  { key: 'submissions_10', title: 'Homework Hero', check: s => s.submissions_count >= 10 },
  { key: 'perfect_score', title: 'Perfectionist', check: s => s.had_perfect_score },
];

export function levelForXp(xp) {
  let level = 1, need = 100, remaining = xp;
  while (remaining >= need) { remaining -= need; level++; need = 100 + (level - 1) * 40; }
  return level;
}
export function xpIntoLevel(xp) {
  let level = 1, need = 100, remaining = xp;
  while (remaining >= need) { remaining -= need; level++; need = 100 + (level - 1) * 40; }
  return { level, into: remaining, need };
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000); }

// Awards XP + updates streaks/counters + unlocks badges for one user.
// `patch` is a partial update applied to the counter columns (e.g.
// { classes_attended: 1 } to increment attendance count by 1).
// Returns { stats, newBadges, leveledUp } so callers can surface a
// celebration toast in the UI.
export async function awardXP(supabase, { user_id, user_name, avatar_url, role, amount, patch = {}, perfectScore = false }) {
  if (!user_id) return null;
  const { data: existing } = await supabase.from('user_stats').select('*').eq('user_id', user_id).maybeSingle();
  const today = todayStr();
  let streak = existing?.streak || 0;
  let longest = existing?.longest_streak || 0;
  if (!existing?.last_active_date) streak = 1;
  else {
    const gap = daysBetween(existing.last_active_date, today);
    if (gap === 0) streak = existing.streak || 1;
    else if (gap === 1) streak = (existing.streak || 0) + 1;
    else streak = 1;
  }
  longest = Math.max(longest, streak);
  const prevXp = existing?.xp || 0;
  const newXp = prevXp + (amount || 0);
  const newLevel = levelForXp(newXp);
  const prevLevel = existing?.level || 1;
  const row = {
    user_id, full_name: user_name || existing?.full_name || '', avatar_url: avatar_url || existing?.avatar_url || '', role: role || existing?.role || 'student',
    xp: newXp, level: newLevel, streak, longest_streak: longest, last_active_date: today,
    classes_attended: (existing?.classes_attended || 0) + (patch.classes_attended || 0),
    face_verified_count: (existing?.face_verified_count || 0) + (patch.face_verified_count || 0),
    submissions_count: (existing?.submissions_count || 0) + (patch.submissions_count || 0),
    had_perfect_score: existing?.had_perfect_score || perfectScore,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = existing
    ? await supabase.from('user_stats').update(row).eq('user_id', user_id).select().single()
    : await supabase.from('user_stats').insert(row).select().single();
  if (error) { console.error('awardXP failed', error); return null; }

  const { data: earnedRows } = await supabase.from('user_badges').select('badge_key').eq('user_id', user_id);
  const earnedKeys = new Set((earnedRows || []).map(r => r.badge_key));
  const newBadges = BADGE_DEFS.filter(b => !earnedKeys.has(b.key) && b.check(saved));
  if (newBadges.length) {
    await supabase.from('user_badges').insert(newBadges.map(b => ({ user_id, badge_key: b.key })));
    await supabase.from('notifications').insert(newBadges.map(b => ({ user_id, type: 'badge', title: 'New badge: ' + b.title, body: 'You just unlocked an achievement!', link: '/achievements' })));
  }
  const leveledUp = newLevel > prevLevel;
  if (leveledUp) {
    await supabase.from('notifications').insert({ user_id, type: 'level', title: `Level up! You're now level ${newLevel}`, body: `+${amount} XP earned`, link: '/achievements' });
  }
  return { stats: saved, newBadges: newBadges.map(b => b.key), leveledUp, xpAwarded: amount };
}
