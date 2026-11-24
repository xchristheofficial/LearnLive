import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check, AlertTriangle, Sun, ScanFace } from 'lucide-react';

export default function FaceCapture({ onCapture, onError, instruction = 'Look straight at the camera', autoStart = true, autoCapture = true }: any) {
  const videoRef = useRef<any>(null); const streamRef = useRef<any>(null); const scanRef = useRef<any>(null); const stableRef = useRef(0); const lockRef = useRef(false);
  const [photo, setPhoto] = useState<string>(''); const [err, setErr] = useState(''); const [on, setOn] = useState(false); const [quality, setQuality] = useState('');
  const [scan, setScan] = useState<'idle' | 'searching' | 'found' | 'capturing'>('idle');

  const capture = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas'); c.width = 480; c.height = 480;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const size = Math.min(v.videoWidth, v.videoHeight); const sx = (v.videoWidth - size) / 2;
    ctx.translate(480, 0); ctx.scale(-1, 1); ctx.drawImage(v, sx, 0, size, size, 0, 0, 480, 480);
    try { const d = ctx.getImageData(0, 0, 480, 480).data; let sum = 0; for (let i = 0; i < d.length; i += 40) sum += (d[i] + d[i + 1] + d[i + 2]) / 3; const avg = sum / (d.length / 40); setQuality(avg < 45 ? 'Too dark — face a light source and retake if you can.' : avg > 230 ? 'Very bright — move away from strong backlight if you can.' : 'Good lighting ✓'); } catch {}
    const url = c.toDataURL('image/jpeg', 0.84); setPhoto(url); setScan('idle'); onCapture && onCapture(url);
  };

  const stopScan = () => { if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null; } };

  // Lightweight on-device face presence detector: samples the oval guide
  // region for skin-tone pixels each tick. Once a face is reliably centered
  // for a short, stable stretch, it auto-triggers the capture — no button
  // needed. Runs fully in the browser, no network calls, no paid APIs.
  const beginScan = () => {
    stopScan(); lockRef.current = false; stableRef.current = 0; setScan('searching');
    scanRef.current = setInterval(() => {
      if (lockRef.current) return;
      const v = videoRef.current; if (!v || v.readyState < 2 || !v.videoWidth) return;
      const s = 90; const c = document.createElement('canvas'); c.width = s; c.height = s;
      const ctx = c.getContext('2d'); if (!ctx) return;
      const size = Math.min(v.videoWidth, v.videoHeight); const sx = (v.videoWidth - size) / 2; const sy = (v.videoHeight - size) / 2;
      ctx.drawImage(v, sx, sy, size, size, 0, 0, s, s);
      const rx = Math.round(s * 0.26), ry = Math.round(s * 0.14), rw = Math.round(s * 0.48), rh = Math.round(s * 0.68);
      let data: Uint8ClampedArray;
      try { data = ctx.getImageData(rx, ry, rw, rh).data; } catch { return; }
      let skin = 0, total = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]; total++;
        if (r > 55 && g > 30 && b > 15 && r > g && r > b * 1.05 && (r - g) > 8 && (r - b) > 12) skin++;
      }
      const ratio = total ? skin / total : 0;
      if (ratio > 0.3) { stableRef.current += 1; setScan('found'); } else { stableRef.current = Math.max(0, stableRef.current - 1); setScan('searching'); }
      if (stableRef.current >= 5 && !lockRef.current) { lockRef.current = true; setScan('capturing'); stopScan(); setTimeout(() => capture(), 450); }
    }, 170);
  };

  const start = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setOn(true);
      if (autoCapture) setTimeout(beginScan, 500);
    } catch (e: any) { const m = 'Camera not available. Allow camera permission in your browser, or upload a clear selfie below instead.'; setErr(m); onError && onError(m); }
  };
  const stop = () => { stopScan(); streamRef.current?.getTracks().forEach((t: any) => t.stop()); streamRef.current = null; setOn(false); };
  useEffect(() => { if (autoStart) start(); return () => stop(); }, []);

  const retake = () => { setPhoto(''); setQuality(''); onCapture && onCapture(''); if (on) beginScan(); else start(); };
  const onFile = (e: any) => { const f = e.target.files?.[0]; if (!f) return; stopScan(); const r = new FileReader(); r.onload = () => { const u = String(r.result); setPhoto(u); onCapture && onCapture(u); setQuality('Photo uploaded ✓'); }; r.readAsDataURL(f); };

  const ringColor = scan === 'found' || scan === 'capturing' ? 'border-emerald-400' : 'border-white/80';
  const statusText = photo ? 'Looks good? Keep it or retake' : scan === 'found' ? 'Face found — hold still…' : scan === 'capturing' ? 'Capturing…' : scan === 'searching' ? 'Looking for your face…' : instruction;

  return (
    <div>
      <div className="relative mx-auto w-full max-w-[340px] aspect-square rounded-[2rem] overflow-hidden bg-slate-900 shadow-xl ring-1 ring-black/10">
        {photo ? <img src={photo} className="w-full h-full object-cover" alt="Captured face" /> : <video ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" />}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center"><div className={`w-[62%] h-[78%] rounded-[50%] border-[3px] border-dashed transition-colors duration-300 ${ringColor} shadow-[0_0_0_999px_rgba(0,0,0,0.25)]`} /></div>
        {!photo && <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/55 text-white text-[11px] font-bold px-2.5 py-1 rounded-full"><ScanFace size={13} className={scan === 'found' || scan === 'capturing' ? 'text-emerald-400' : 'text-indigo-300'} /> {scan === 'capturing' ? 'Capturing' : scan === 'found' ? 'Face detected' : on ? 'Scanning' : 'Starting camera'}</div>}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap">{statusText}</div>
        {photo && <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1.5 rounded-full"><Check size={16} /></div>}
      </div>
      {err && <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" />{err}</p>}
      {quality && <p className="mt-2 text-xs text-center text-slate-500 flex items-center justify-center gap-1"><Sun size={13} /> {quality}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {!photo ? <button onClick={on ? capture : start} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-full shadow"><Camera size={18} /> {on ? 'Capture now' : 'Turn camera on'}</button>
          : <button onClick={retake} className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-slate-400 font-semibold px-5 py-2.5 rounded-full"><RefreshCw size={16} /> Retake</button>}
        <label className="cursor-pointer text-sm font-medium text-indigo-700 hover:underline px-2">Upload a selfie instead<input type="file" accept="image/*" className="hidden" onChange={onFile} /></label>
      </div>
      {!photo && on && autoCapture && <p className="text-center text-[11px] text-slate-400 mt-2">Auto-capture is on — we snap your photo automatically the moment your face is detected, or tap "Capture now" anytime.</p>}
    </div>
  );
}
