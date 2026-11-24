import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { subscribeToasts, type ToastPayload } from '../lib/toastBus';

const STYLES: Record<string, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
  info: 'bg-slate-900 text-white',
};
const ICONS: Record<string, any> = { success: CheckCircle2, error: XCircle, info: Info };

// Mounted once near the app root. Listens for toast() calls from anywhere
// in the app (including plain .ts helpers outside React) and renders a
// friendly, auto-dismissing stack in the corner — replaces jarring native
// alert() popups with something that matches the app's design.
export default function Toaster() {
  const [items, setItems] = useState<ToastPayload[]>([]);
  useEffect(() => {
    const unsubscribe = subscribeToasts(t => {
      setItems(prev => [...prev, t]);
      setTimeout(() => setItems(prev => prev.filter(x => x.id !== t.id)), 4200);
    });
    return () => { unsubscribe(); };
  }, []);
  if (!items.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[90vw] w-80">
      {items.map(t => { const Icon = ICONS[t.kind]; return (
        <div key={t.id} className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 shadow-2xl text-sm font-semibold animate-[toastIn_0.25s_ease-out] ${STYLES[t.kind]}`}>
          <Icon size={18} className="shrink-0 mt-0.5" />
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => setItems(prev => prev.filter(x => x.id !== t.id))} className="shrink-0 opacity-70 hover:opacity-100"><X size={15} /></button>
        </div>
      ); })}
    </div>
  );
}
