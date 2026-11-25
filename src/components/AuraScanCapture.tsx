import { useEffect, useRef, useState } from 'react';
import { ScanFace, RefreshCw, ShieldCheck, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { auraScanFrame, auraScanStart, type AuraConfig, type AuraStep } from '../lib/aurascan';

// Live face scan powered by AuraScan: look straight -> turn one way -> turn the
// other way -> look straight. A printed photo or a phone screen cannot pass.
// When it passes, onDone gets a one-time scan ID (finished on our server with
// the secret key) plus three still photos (front / left / right) in the same
// mirrored square format FaceCapture produces, so the rest of LearnLive keeps working.
export interface AuraScanResult { challenge_id: string; photos: { front: string; left: string; right: string } }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function AuraScanCapture({ cfg, onDone, onError, title = 'Live face scan', autoStart = true }: {
  cfg: AuraConfig; onDone: (r: AuraScanResult) => void; onError?: (msg: string) => void; title?: string; autoStart?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null); const streamRef = useRef<MediaStream | null>(null); const runRef = useRef(0);
  const [phase, setPhase] = useState<'idle' | 'camera' | 'scanning' | 'passed' | 'error' | 'timeout'>('idle');
  const [steps, setSteps] = useState<AuraStep[]>([]); const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState(''); const [warn, setWarn] = useState(false); const [err, setErr] = useState(''); const [still, setStill] = useState('');

  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  useEffect(() => { if (autoStart) run(); return () => { runRef.current++; stopCamera(); }; }, []);

  // Frame for AuraScan (as the camera sees it, max 480px wide).
  const grab = (v: HTMLVideoElement) => {
    const sc = Math.min(1, 480 / v.videoWidth); const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.8);
  };
  // Still photo for LearnLive (mirrored centre square, same as FaceCapture).
  const photo = (v: HTMLVideoElement) => {
    const c = document.createElement('canvas'); c.width = 480; c.height = 480; const ctx = c.getContext('2d')!;
    const size = Math.min(v.videoWidth, v.videoHeight); const sx = (v.videoWidth - size) / 2; const sy = (v.videoHeight - size) / 2;
    ctx.translate(480, 0); ctx.scale(-1, 1); ctx.drawImage(v, sx, sy, size, size, 0, 0, 480, 480); return c.toDataURL('image/jpeg', 0.84);
  };

  const fail = (m: string) => { setErr(m); setPhase('error'); stopCamera(); onError?.(m); };

  async function run() {
    const me = ++runRef.current; const alive = () => runRef.current === me;
    setErr(''); setStill(''); setIdx(0); setWarn(false); setPhase('camera'); setMsg('Starting camera…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot open the camera. Use Chrome, Safari or Edge over https.');
      if (!streamRef.current) streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      const v = videoRef.current!; v.srcObject = streamRef.current; await v.play().catch(() => {});
    } catch (e: any) { return fail(/denied|permission|NotAllowed/i.test(String(e?.name) + String(e?.message)) ? 'Camera permission was denied. Allow camera access in your browser and try again.' : (e?.message || 'Camera not available')); }
    if (!alive()) return;
    let ch: Awaited<ReturnType<typeof auraScanStart>>;
    try { ch = await auraScanStart(cfg); } catch (e: any) { return fail(e.message); }
    if (!alive()) return;
    setSteps(ch.steps); setPhase('scanning'); setMsg(ch.steps[0]?.instruction || 'Look straight at the camera');
    const shots: { front?: string; left?: string; right?: string } = {};
    let cur = 0; const deadline = Date.now() + (ch.expires_in || 120) * 1000 - 3000;
    while (alive() && Date.now() < deadline) {
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        const frame = grab(v); const pic = photo(v);
        let r: any;
        try { r = await auraScanFrame(cfg, ch.challenge_id, frame); }
        catch (e: any) {
          if (e.status === 403 || e.status === 410 || e.status === 429) return fail(e.message);
          setWarn(true); setMsg('Connection slow… keep still'); await sleep(600); continue;
        }
        if (!alive()) return;
        const next = r.passed ? ch.steps.length : (r.step_index ?? cur);
        // A step was just completed with this frame: keep it as a photo.
        for (let s = cur; s < next; s++) {
          const st = ch.steps[s]; if (!st) continue;
          if (st.id === 'center' && !shots.front) shots.front = pic;
          else if (/LEFT/i.test(st.instruction) && !shots.left) shots.left = pic;
          else if (/RIGHT/i.test(st.instruction) && !shots.right) shots.right = pic;
        }
        if (next < cur) shots.front = shots.left = shots.right = undefined; // restarted (e.g. photo detected)
        cur = next; setIdx(Math.min(next, ch.steps.length));
        const w = !!r.message && r.message !== '✓'; setWarn(w); setMsg(w ? r.message : (r.instruction || ''));
        if (r.passed) {
          const front = shots.front || pic;
          const out = { challenge_id: ch.challenge_id, photos: { front, left: shots.left || front, right: shots.right || front } };
          setStill(front); setPhase('passed'); setMsg('Live face confirmed ✓'); stopCamera(); onDone(out); return;
        }
      }
      await sleep(160);
    }
    if (alive()) { setPhase('timeout'); stopCamera(); }
  }

  const st = steps[idx]; const turn = phase === 'scanning' && st ? (/LEFT/i.test(st.instruction) ? 'left' : /RIGHT/i.test(st.instruction) ? 'right' : '') : '';
  return <div>
    <div className="flex items-center justify-between mb-3"><p className="font-extrabold text-sm flex items-center gap-2 text-slate-800"><ScanFace size={18} className="text-indigo-600" /> {title}</p><span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">AuraScan</span></div>
    <div className="relative aspect-[3/4] max-h-[52vh] w-full mx-auto rounded-3xl overflow-hidden bg-slate-900">
      {still ? <img src={still} alt="Your live scan" className="absolute inset-0 w-full h-full object-cover" />
        : <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />}
      <div className={`absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[64%] aspect-[3/4] rounded-[50%] border-[3px] pointer-events-none transition-colors ${phase === 'passed' ? 'border-emerald-400' : warn ? 'border-amber-400' : phase === 'scanning' ? 'border-teal-300' : 'border-white/70'}`} style={{ boxShadow: '0 0 0 999px rgba(2,6,23,.45)' }} />
      {turn === 'left' && <ChevronLeft className="absolute left-2 top-1/2 -translate-y-1/2 text-white animate-pulse" size={44} />}
      {turn === 'right' && <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-white animate-pulse" size={44} />}
      {(phase === 'camera' || phase === 'scanning' || phase === 'passed') && <p className={`absolute bottom-3 left-3 right-3 text-center text-sm font-bold px-3 py-2 rounded-xl ${phase === 'passed' ? 'bg-emerald-600 text-white' : warn ? 'bg-amber-400 text-slate-900' : 'bg-slate-900/75 text-white'}`} data-aura-msg>{msg}</p>}
      {(phase === 'error' || phase === 'timeout' || phase === 'idle') && <div className="absolute inset-0 grid place-items-center p-6 text-center text-white bg-slate-900/80"><div>
        {phase === 'idle' ? <ScanFace className="mx-auto text-teal-300" size={34} /> : <AlertTriangle className="mx-auto text-amber-300" size={32} />}
        <p className="text-sm mt-3">{phase === 'error' ? err : phase === 'timeout' ? "Time's up. Let's try again." : 'Ready when you are.'}</p>
        <button onClick={() => run()} className="mt-4 inline-flex items-center gap-2 bg-white text-slate-900 font-bold text-sm px-4 py-2 rounded-full"><RefreshCw size={15} /> {phase === 'idle' ? 'Start face scan' : 'Try again'}</button>
      </div></div>}
    </div>
    <div className="flex gap-1.5 mt-3">{(steps.length ? steps : [0, 1, 2, 3]).map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${phase === 'passed' || i < idx ? 'bg-emerald-500' : i === idx && phase === 'scanning' ? 'bg-indigo-500' : 'bg-slate-200'}`} />)}</div>
    {phase === 'passed' ? <p className="text-xs text-emerald-700 font-semibold mt-2 flex items-center gap-1.5"><ShieldCheck size={14} /> Real, live face confirmed.</p>
      : <p className="text-[11px] text-slate-500 mt-2">Follow the words on the screen and turn your head slowly. Photos and screens cannot pass this scan.</p>}
  </div>;
}
