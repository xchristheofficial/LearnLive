export async function api(path: string, options: any = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'Something went wrong');
  return data;
}
export async function uploadDataUrl(dataUrl: string, prefix = 'face'): Promise<string> {
  const base64 = dataUrl.split(',')[1] || '';
  const out = await api('/api/upload', { method: 'POST', body: JSON.stringify({ fileName: `${prefix}-${Date.now()}.jpg`, fileBase64: base64, contentType: 'image/jpeg' }) });
  return out.url;
}
export const fmtDate = (d: any) => d ? new Date(d).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
export const fmtDay = (d: any) => d ? new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '—';
export const initials = (n: string = '') => n.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('') || 'U';
export const COLORS: any = {
  indigo: 'from-indigo-500 to-violet-600', teal: 'from-teal-500 to-emerald-600', amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-pink-600', sky: 'from-sky-500 to-blue-600', emerald: 'from-emerald-500 to-green-600', violet: 'from-violet-500 to-purple-700'
};
