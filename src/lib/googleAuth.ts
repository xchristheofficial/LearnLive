import supabase from './supabase';
import { playSignInSound } from './sound';
import { toast } from './toastBus';
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
function buildGoogleUrl(appName: string) {
  const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = (import.meta as any).env.VITE_GOOGLE_AUTH_PROXY;
  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  if (!clientId || !redirectUri) return null;
  const state = btoa(JSON.stringify({ origin: window.location.origin, appName, supabaseUrl, supabaseAnonKey }));
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&prompt=select_account&state=${encodeURIComponent(state)}`;
}
export function signInWithGoogle(appName = 'LearnLive') {
  const url = buildGoogleUrl(appName);
  if (!url) { toast.error('Google sign-in is not configured here — please use email & password (it is free).'); return; }
  const popup = window.open(url, 'google-auth', isMobile() ? '' : 'width=500,height=600');
  const handler = async (event: MessageEvent) => {
    if (event.source !== popup) return;
    if (event.data?.type === 'google-auth-denied') { window.removeEventListener('message', handler); return; }
    if (event.data?.type !== 'google-auth-success') return;
    window.removeEventListener('message', handler);
    const { access_token, refresh_token } = event.data;
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (!error) playSignInSound(); else toast.error('Google sign-in failed — please try again.');
  };
  window.addEventListener('message', handler);
}
export async function handleGoogleRedirect() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (!fragment.has('google_auth_popup')) return;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return;
  window.close();
}
