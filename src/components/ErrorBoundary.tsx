import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

// Catches runtime render errors anywhere below it so a bug in one page
// (e.g. a bad API response) shows a friendly recovery screen instead of a
// blank white page / frozen UI.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };
  static getDerivedStateFromError(err: any): State { return { hasError: true, message: err?.message || 'Something went wrong.' }; }
  componentDidCatch(err: any, info: any) { console.error('LearnLive crashed:', err, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-[#f6f7fb] grid place-items-center p-6">
        <div className="max-w-sm w-full text-center bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
          <span className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 grid place-items-center mx-auto"><AlertTriangle size={26} /></span>
          <h1 className="text-xl font-extrabold mt-4">Something went wrong</h1>
          <p className="text-sm text-slate-500 mt-1.5">An unexpected error interrupted this page. Your data is safe — try reloading.</p>
          <div className="flex flex-col gap-2 mt-5">
            <button onClick={() => window.location.reload()} className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm"><RefreshCw size={16} /> Reload page</button>
            <button onClick={() => { window.location.href = '/dashboard'; }} className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm"><Home size={16} /> Go to dashboard</button>
          </div>
        </div>
      </div>
    );
  }
}
