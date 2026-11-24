import supabase from './db-client.js';
import { levelForXp, xpIntoLevel, awardXP, BADGE_DEFS } from './_gamification.js';
const cors=(req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');if(req.method==='OPTIONS'){res.status(204).end();return true;}return false;};
const ACTION_XP = { daily_login: 5, attend: 15, attend_verified: 25, submit: 10 };
export default async function handler(req, res) { if (cors(req, res)) return; try {
  if (req.method === 'GET') {
    if (req.query.leaderboard) {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const { data, error } = await supabase.from('user_stats').select('*').order('xp', { ascending: false }).limit(limit);
      if (error) throw error;
      return res.status(200).json(data);
    }
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const { data } = await supabase.from('user_stats').select('*').eq('user_id', user_id).maybeSingle();
    const { data: badgeRows } = await supabase.from('user_badges').select('badge_key, earned_at').eq('user_id', user_id);
    const stats = data || { user_id, xp: 0, level: 1, streak: 0, longest_streak: 0, classes_attended: 0, face_verified_count: 0, submissions_count: 0, had_perfect_score: false };
    const { level, into, need } = xpIntoLevel(stats.xp || 0);
    return res.status(200).json({ ...stats, level, xp_into_level: into, xp_for_next_level: need, badges: badgeRows || [], catalog: BADGE_DEFS.map(b => ({ key: b.key, title: b.title })) });
  }
  if (req.method === 'POST') {
    const b = req.body || {};
    const amount = ACTION_XP[b.action] ?? (Number(b.amount) || 0);
    const result = await awardXP(supabase, { user_id: b.user_id, user_name: b.user_name, avatar_url: b.avatar_url, role: b.role, amount });
    if (!result) return res.status(500).json({ error: 'Could not award XP' });
    return res.status(200).json(result);
  }
  res.status(405).json({ error: 'Method not allowed' });
} catch (err) { res.status(500).json({ error: err.message }); } }
