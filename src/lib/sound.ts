// Lightweight sound effects generated on-device with the Web Audio API —
// no audio files to fetch, works instantly and offline, zero cost.
let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) { const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext; if (!Ctor) return null; ctx = new Ctor(); }
  const current: AudioContext = ctx as AudioContext;
  if (current.state === 'suspended') current.resume().catch(() => {});
  return current;
};

function tone(freq: number, start: number, dur: number, gainPeak = 0.14, type: OscillatorType = 'sine') {
  const ac = getCtx(); if (!ac) return;
  const osc = ac.createOscillator(); const gain = ac.createGain();
  osc.type = type; osc.frequency.value = freq;
  osc.connect(gain); gain.connect(ac.destination);
  const t0 = ac.currentTime + start;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

// Cheerful ascending chime played right after a successful sign-in / sign-up.
export function playSignInSound() {
  try { tone(523.25, 0, 0.22); tone(659.25, 0.09, 0.22); tone(783.99, 0.18, 0.32); } catch {}
}

// Soft low buzz for a failed sign-in attempt.
export function playErrorSound() {
  try { tone(196, 0, 0.18, 0.1, 'square'); tone(146.83, 0.1, 0.22, 0.1, 'square'); } catch {}
}
