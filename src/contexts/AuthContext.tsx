import { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { api } from '../lib/api';
const Ctx = createContext<any>({ user: null, profile: null, loading: true, refreshProfile: async () => {}, signOut: async () => {} });
export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<any>(null); const [profile, setProfile] = useState<any>(null); const [loading, setLoading] = useState(true);
  const ensureProfile = async (u: any) => {
    if (!u) { setProfile(null); return; }
    try {
      let p = await api(`/api/profiles?id=${u.id}`);
      if (!p) {
        let pending: any = null; try { pending = JSON.parse(localStorage.getItem('pending_profile') || 'null'); } catch {}
        const email = u.email || '';
        p = await api('/api/profiles', { method: 'POST', body: JSON.stringify({ id: u.id, email, full_name: pending?.full_name || u.user_metadata?.full_name || email.split('@')[0].replace(/\./g, ' '), role: pending?.role || 'student' }) });
        localStorage.removeItem('pending_profile');
      }
      setProfile(p);
    } catch (e) { console.error(e); }
  };
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => { setUser(session?.user ?? null); await ensureProfile(session?.user ?? null); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => { setUser(session?.user ?? null); await ensureProfile(session?.user ?? null); setLoading(false); });
    return () => subscription.unsubscribe();
  }, []);
  const refreshProfile = async () => { if (user) await ensureProfile(user); };
  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); };
  return <Ctx.Provider value={{ user, profile, loading, refreshProfile, signOut }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
