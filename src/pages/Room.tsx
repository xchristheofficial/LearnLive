import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, MonitorUp, Hand, MessagesSquare, Users, PhoneOff, Send, BadgeCheck, ScanFace, ThumbsUp, Heart, Star, Copy, Check, PenTool, Eraser, Circle, Square, Crown, BarChart3, VolumeX, Plus, X } from 'lucide-react';
import FaceCapture from '../components/FaceCapture';
import { api, initials, uploadDataUrl } from '../lib/api';
import { bestFaceMatch, FACE_MATCH_THRESHOLD } from '../lib/faceMatch';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../lib/toastBus';
import AuraScanCapture, { type AuraScanResult } from '../components/AuraScanCapture';
import { getAuraConfig, auraAction, auraEnrolled, type AuraConfig } from '../lib/aurascan';
const REACTIONS: any = { thumbsup: ThumbsUp, heart: Heart, star: Star };

export default function Room() {
  const { sessionId } = useParams(); const nav = useNavigate(); const { profile, user } = useAuth();
  const [session, setSession] = useState<any>(null); const [cls, setCls] = useState<any>(null); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false); const [checkin, setCheckin] = useState(''); const [joining, setJoining] = useState(false); const [attId, setAttId] = useState<any>(null);
  const [mic, setMic] = useState(true); const [cam, setCam] = useState(true); const [sharing, setSharing] = useState(false); const [hand, setHand] = useState(false);
  const [people, setPeople] = useState<any[]>([]); const [msgs, setMsgs] = useState<any[]>([]); const [draft, setDraft] = useState(''); const [panel, setPanel] = useState<'chat' | 'people' | 'board' | 'poll' | ''>('chat');
  const [activePoll, setActivePoll] = useState<any>(null); const [pollVotes, setPollVotes] = useState<any[]>([]); const [pollDraft, setPollDraft] = useState<{ question: string; options: string[] }>({ question: '', options: ['', ''] });
  const [floats, setFloats] = useState<any[]>([]); const [copied, setCopied] = useState(false); const [recording, setRecording] = useState(false); const [seconds, setSeconds] = useState(0); const [color, setColor] = useState('#4f46e5'); const [erase, setErase] = useState(false);
  const videoRef = useRef<any>(null); const streamRef = useRef<any>(null); const screenRef = useRef<any>(null); const recRef = useRef<any>(null); const chunksRef = useRef<any[]>([]); const seenRef = useRef<any>(new Set()); const boardRef = useRef<any>(null); const drawingRef = useRef(false); const chatEndRef = useRef<any>(null);
  // AuraScan (optional): live face check-in confirmed on the server. Only used
  // when AuraScan is on AND this account's face is registered there.
  const [aura, setAura] = useState<AuraConfig | null>(null); const [auraIn, setAuraIn] = useState(false); const [proof, setProof] = useState(''); const [auraErr, setAuraErr] = useState(''); const [auraBusy, setAuraBusy] = useState(false); const [scanKey, setScanKey] = useState(0);
  useEffect(() => { (async () => { const c = await getAuraConfig(); if (c.enabled) { setAura(c); setAuraIn(await auraEnrolled()); } })(); }, []);
  const auraCheckin = async (r: AuraScanResult) => {
    setAuraBusy(true); setAuraErr('');
    try {
      const v = await auraAction('checkin', { challenge_id: r.challenge_id, session_id: Number(sessionId) });
      if (v.verified && v.proof) { setProof(v.proof); setCheckin(r.photos.front); }
      else setAuraErr(v.reason || 'Face does not match this account');
    } catch (e: any) { setAuraErr(e.message); }
    setAuraBusy(false);
  };
  const isTeacherSession = session && user && (session.teacher_id === user.id || (cls && cls.teacher_id === user.id));
  useEffect(() => { (async () => { try { const s = await api(`/api/sessions?id=${sessionId}`); if (!s) { setErr('This lesson could not be found.'); setLoading(false); return; } setSession(s); const c = await api(`/api/classes?id=${s.class_id}`); setCls(c); } catch (e: any) { setErr(e.message); } setLoading(false); })(); }, [sessionId]);
  const refresh = async () => { try { const [p, m] = await Promise.all([api(`/api/attendance?session_id=${sessionId}`), api(`/api/messages?session_id=${sessionId}`)]); setPeople(p || []); setMsgs(m || []); (m || []).forEach((x: any) => { if (x.msg_type === 'reaction' && !seenRef.current.has(x.id)) { seenRef.current.add(x.id); const fid = Date.now() + x.id; setFloats(f => [...f, { id: fid, kind: x.content, left: 15 + Math.random() * 60 }]); setTimeout(() => setFloats(f => f.filter(y => y.id !== fid)), 2400); } else if (!seenRef.current.has(x.id)) seenRef.current.add(x.id); }); const s = await api(`/api/sessions?id=${sessionId}`); if (s) setSession(s); try { const polls = await api(`/api/polls?session_id=${sessionId}`); const live = (polls || []).find((pl: any) => pl.status === 'open') || null; setActivePoll(live); if (live) { const votes = await api(`/api/poll-votes?poll_id=${live.id}`); setPollVotes(votes || []); } else setPollVotes([]); } catch {} } catch {} };
  useEffect(() => { if (!joined) return; refresh(); const t = setInterval(refresh, 3000); const c = setInterval(() => setSeconds(v => v + 1), 1000); return () => { clearInterval(t); clearInterval(c); }; }, [joined]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, panel]);
  const startMedia = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; } } catch { setErr('Camera/microphone permission was denied. You can still use chat, but others cannot see or hear you. Allow access in your browser settings to fix this.'); } };
  const stopMedia = () => { streamRef.current?.getTracks().forEach((t: any) => t.stop()); screenRef.current?.getTracks().forEach((t: any) => t.stop()); };
  const join = async () => {
    setJoining(true);
    try {
      let faceUrl = ''; let verified = false;
      if (checkin && proof) {
        // Confirmed by AuraScan on the server; attendance checks the proof itself.
        faceUrl = await uploadDataUrl(checkin, 'checkin'); verified = true;
      } else if (checkin) {
        faceUrl = await uploadDataUrl(checkin, 'checkin');
        // Actually compare the check-in photo to this account's registered
        // face photos — don't just trust that the account has a face
        // registered, since that alone doesn't prove this photo is really
        // of this person. Only a real match earns the verified badge.
        if (profile?.face_registered) {
          const score = await bestFaceMatch(checkin, profile.face_images || []);
          verified = score !== null && score >= FACE_MATCH_THRESHOLD;
        }
      }
      const a = await api('/api/attendance', { method: 'POST', body: JSON.stringify({ session_id: Number(sessionId), class_id: session.class_id, user_id: user.id, user_name: profile?.full_name || 'Learner', role: profile?.role || 'student', face_verified: verified, aura_proof: proof || undefined, face_image_url: faceUrl, avatar_url: profile?.avatar_url || '' }) });
      if (typeof a.face_verified === 'boolean') verified = a.face_verified; // the server has the final say
      setAttId(a.id); setJoined(true); setTimeout(startMedia, 150);
      const g = a.gamification;
      if (g?.xpAwarded) {
        toast.success(`+${g.xpAwarded} XP for joining${verified ? ' (face verified)' : ''}! ${g.stats?.streak > 1 ? `🔥 ${g.stats.streak}-day streak` : ''}`);
        if (g.leveledUp) toast.success(`🎉 Level up! You're now level ${g.stats.level}`);
        (g.newBadges || []).forEach((key: string) => toast.success(`🏆 New badge unlocked: ${key.replace(/_/g, ' ')}`));
      }
    } catch (e: any) { setErr(e.message); }
    setJoining(false);
  };
  const updAtt = (fields: any) => { if (attId) api('/api/attendance', { method: 'PUT', body: JSON.stringify({ id: attId, ...fields }) }).catch(() => {}); };
  const toggleMic = () => { const v = !mic; setMic(v); streamRef.current?.getAudioTracks().forEach((t: any) => t.enabled = v); updAtt({ mic_on: v }); };
  const toggleCam = () => { const v = !cam; setCam(v); streamRef.current?.getVideoTracks().forEach((t: any) => t.enabled = v); updAtt({ cam_on: v }); };
  const toggleHand = () => { const v = !hand; setHand(v); updAtt({ hand_raised: v }); refresh(); };
  const shareScreen = async () => {
    if (sharing) { screenRef.current?.getTracks().forEach((t: any) => t.stop()); screenRef.current = null; setSharing(false); if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; return; }
    try { const s: any = await (navigator.mediaDevices as any).getDisplayMedia({ video: true }); screenRef.current = s; setSharing(true); if (videoRef.current) videoRef.current.srcObject = s; s.getVideoTracks()[0].onended = () => { setSharing(false); if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; }; } catch {}
  };
  const toggleRecord = () => {
    if (recording) { recRef.current?.stop(); setRecording(false); return; }
    const src = sharing ? screenRef.current : streamRef.current; if (!src) return;
    chunksRef.current = []; const rec = new MediaRecorder(src); recRef.current = rec;
    rec.ondataavailable = (e: any) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => { const blob = new Blob(chunksRef.current, { type: 'video/webm' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `learnlive-${session?.title || 'lesson'}.webm`; a.click(); };
    rec.start(); setRecording(true);
  };
  const sendMsg = async (e?: any) => { e?.preventDefault(); if (!draft.trim()) return; const content = draft.trim(); setDraft(''); await api('/api/messages', { method: 'POST', body: JSON.stringify({ session_id: Number(sessionId), class_id: session.class_id, user_id: user.id, user_name: profile?.full_name, content }) }); refresh(); };
  const react = async (kind: string) => { await api('/api/messages', { method: 'POST', body: JSON.stringify({ session_id: Number(sessionId), class_id: session.class_id, user_id: user.id, user_name: profile?.full_name, content: kind, msg_type: 'reaction' }) }); refresh(); };
  const createPoll = async () => { const opts = pollDraft.options.map(o => o.trim()).filter(Boolean); if (!pollDraft.question.trim() || opts.length < 2) return; await api('/api/polls', { method: 'POST', body: JSON.stringify({ session_id: Number(sessionId), class_id: session.class_id, question: pollDraft.question.trim(), options: opts }) }); setPollDraft({ question: '', options: ['', ''] }); refresh(); };
  const votePoll = async (idx: number) => { if (!activePoll) return; await api('/api/poll-votes', { method: 'POST', body: JSON.stringify({ poll_id: activePoll.id, user_id: user.id, user_name: profile?.full_name, option_index: idx }) }); refresh(); };
  const closePoll = async () => { if (!activePoll) return; await api('/api/polls', { method: 'PUT', body: JSON.stringify({ id: activePoll.id, status: 'closed' }) }); refresh(); };
  const muteAll = async () => { await Promise.all(others.filter((p: any) => p.mic_on !== false).map((p: any) => api('/api/attendance', { method: 'PUT', body: JSON.stringify({ id: p.id, mic_on: false }) }).catch(() => {}))); refresh(); };
  const leave = () => { stopMedia(); nav(cls ? `/classes/${cls.id}` : '/schedule'); };
  const endSession = async () => { if (!confirm('End this lesson for everyone?')) return; await api('/api/sessions', { method: 'PUT', body: JSON.stringify({ id: session.id, status: 'ended' }) }); leave(); };
  useEffect(() => () => stopMedia(), []);
  const boardPos = (e: any) => { const r = boardRef.current.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: (t.clientX - r.left) * (boardRef.current.width / r.width), y: (t.clientY - r.top) * (boardRef.current.height / r.height) }; };
  const boardDown = (e: any) => { drawingRef.current = true; const ctx = boardRef.current.getContext('2d'); const p = boardPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const boardMove = (e: any) => { if (!drawingRef.current || !boardRef.current) return; const ctx = boardRef.current.getContext('2d'); const p = boardPos(e); ctx.strokeStyle = erase ? '#ffffff' : color; ctx.lineWidth = erase ? 22 : 4; ctx.lineCap = 'round'; ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const clearBoard = () => { const c = boardRef.current; c?.getContext('2d').clearRect(0, 0, c.width, c.height); };
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0'); const ss = String(seconds % 60).padStart(2, '0');
  if (loading) return <div className="min-h-screen bg-slate-950 grid place-items-center text-white">Loading classroom…</div>;
  if (!session) return <div className="min-h-screen grid place-items-center p-5"><div className="text-center"><p className="font-bold">{err || 'Lesson not found'}</p><Link to="/schedule" className="text-indigo-700 font-bold text-sm">← Back to schedule</Link></div></div>;
  if (!joined) return <div className="min-h-screen bg-slate-950 text-white"><div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-10 items-center">
    <div><span className={`text-xs font-extrabold px-3 py-1.5 rounded-full ${session.status === 'live' ? 'bg-rose-600' : 'bg-slate-700'}`}>{session.status === 'live' ? 'LIVE NOW' : session.status === 'ended' ? 'ENDED' : 'SCHEDULED'}</span><h1 className="text-3xl sm:text-4xl font-extrabold mt-4">{session.title}</h1><p className="text-slate-400 mt-2">{session.class_title} · with {session.teacher_name}</p>
    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 mt-6"><h2 className="font-extrabold flex items-center gap-2"><ScanFace className="text-teal-300" /> Face check-in</h2>{aura && auraIn ? <p className="text-sm text-slate-400 mt-1.5">Do the short live face scan. AuraScan confirms it is really you, and your attendance gets the <b className="text-emerald-300">Face verified</b> badge.</p> : aura && profile?.face_registered ? <p className="text-sm text-slate-400 mt-1.5">Take a quick photo so your attendance is recorded. <Link to="/face-setup" className="font-bold text-teal-300 underline">Do the AuraScan live scan</Link> once to get the Face verified badge.</p> : <p className="text-sm text-slate-400 mt-1.5">Take a quick photo so your attendance is recorded{profile?.face_registered ? ' and marked as face-verified against your registered face profile.' : '. Tip: register your face first to get the verified badge.'}</p>}{!profile?.face_registered && <Link to="/face-setup" className="inline-block mt-3 text-sm font-bold text-teal-300 underline">Register my face first →</Link>}<p className="text-xs text-slate-500 mt-3">You can also join without a photo — your attendance will simply show as “no face photo”.</p></div>
    {err && <p className="mt-4 text-sm bg-rose-500/15 border border-rose-500/40 text-rose-200 rounded-xl px-4 py-3">{err}</p>}
    <button disabled={joining || session.status === 'ended'} onClick={join} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold py-4 rounded-2xl text-lg">{joining ? 'Joining…' : session.status === 'ended' ? 'This lesson has ended' : proof ? 'Join class — face verified ✓' : checkin ? 'Join class with face check-in' : 'Join class'}</button>
    <button onClick={() => nav(-1)} className="w-full mt-2 text-slate-400 text-sm font-semibold py-2">Go back</button></div>
    <div className="bg-white rounded-[2rem] p-5 text-slate-900">{aura && auraIn ? <>
      <AuraScanCapture key={scanKey} cfg={aura} title="Face check-in" onDone={auraCheckin} />
      {auraBusy && <p className="text-sm text-indigo-700 font-semibold mt-3">Confirming with AuraScan…</p>}
      {proof && <p className="text-sm text-emerald-700 font-bold mt-3">✓ Verified. Press “Join class”.</p>}
      {auraErr && <><p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2 mt-3">{auraErr}</p><button onClick={() => { setAuraErr(''); setScanKey(k => k + 1); }} className="w-full mt-2 bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm">Scan again</button></>}
    </> : <FaceCapture instruction="Face check-in — look at the camera" onCapture={(u: string) => setCheckin(u)} />}</div>
  </div></div>;
  const others = people.filter(p => p.user_id !== user.id);
  const chatMsgs = msgs.filter(m => m.msg_type !== 'reaction');
  const Ctrl = ({ onClick, active, danger, label, children }: any) => <button onClick={onClick} title={label} className="flex flex-col items-center gap-1 group"><span className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full grid place-items-center text-white transition ${danger ? 'bg-rose-600 hover:bg-rose-500' : active ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'}`}>{children}</span><span className="text-[10px] text-slate-400 font-semibold hidden sm:block">{label}</span></button>;
  return <div className="min-h-screen bg-slate-950 text-white flex flex-col">
    <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10"><span className="flex items-center gap-2 text-xs font-extrabold bg-rose-600 px-2.5 py-1 rounded-full shrink-0"><span className="w-2 h-2 bg-white rounded-full live-dot" /> LIVE</span><span className="min-w-0"><span className="block font-extrabold truncate">{session.title}</span><span className="block text-xs text-slate-400 truncate">{session.class_title} · {people.length} in class · {mm}:{ss}{recording ? ' · Recording' : ''}</span></span>
    <span className="ml-auto flex items-center gap-2"><button onClick={() => { navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="hidden sm:inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold px-3 py-2 rounded-full">{copied ? <Check size={13} /> : <Copy size={13} />} Copy invite link</button>{isTeacherSession && <button onClick={muteAll} className="hidden sm:inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold px-3 py-2 rounded-full"><VolumeX size={13} /> Mute all</button>}{isTeacherSession && <button onClick={endSession} className="bg-rose-600/20 border border-rose-500/50 text-rose-300 text-xs font-bold px-3 py-2 rounded-full">End for everyone</button>}</span></header>
    {err && <p className="mx-4 mt-3 text-sm bg-amber-500/15 border border-amber-500/40 text-amber-200 rounded-xl px-4 py-2.5">{err}</p>}
    <div className="flex-1 flex min-h-0">
      <main className="flex-1 relative p-3 sm:p-4 overflow-y-auto">
        <div className={`grid gap-3 ${others.length === 0 ? 'grid-cols-1 max-w-3xl mx-auto' : others.length <= 2 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          <div className="relative rounded-3xl overflow-hidden bg-slate-800 aspect-video ring-2 ring-indigo-500"><video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${sharing ? '' : '-scale-x-100'} ${cam || sharing ? '' : 'invisible'}`} />{!cam && !sharing && <div className="absolute inset-0 grid place-items-center"><span className="w-16 h-16 rounded-full bg-indigo-600 grid place-items-center text-xl font-extrabold">{initials(profile?.full_name)}</span></div>}<span className="absolute bottom-2.5 left-2.5 bg-black/60 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">You {sharing ? '(sharing screen)' : ''} {profile?.face_registered && <BadgeCheck size={13} className="text-teal-300" />} {!mic && <MicOff size={13} className="text-rose-300" />}</span>{hand && <span className="absolute top-2.5 right-2.5 bg-amber-400 text-slate-900 p-2 rounded-full"><Hand size={16} /></span>}</div>
          {others.map(p => <div key={p.id} className="relative rounded-3xl overflow-hidden bg-slate-800 aspect-video">{p.face_image_url || p.avatar_url ? <img src={p.face_image_url || p.avatar_url} className="w-full h-full object-cover" alt={p.user_name} /> : <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-700 to-slate-800"><span className="w-16 h-16 rounded-full bg-slate-600 grid place-items-center text-xl font-extrabold">{initials(p.user_name)}</span></div>}<span className="absolute bottom-2.5 left-2.5 bg-black/60 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">{p.role === 'teacher' && <Crown size={12} className="text-amber-300" />}{p.user_name} {p.face_verified && <BadgeCheck size={13} className="text-teal-300" />} {p.mic_on === false && <MicOff size={13} className="text-rose-300" />}</span>{p.hand_raised && <span className="absolute top-2.5 right-2.5 bg-amber-400 text-slate-900 p-2 rounded-full"><Hand size={16} /></span>}<span className="absolute top-2.5 left-2.5 text-[10px] font-bold bg-emerald-500/90 px-2 py-0.5 rounded-full">IN CLASS</span></div>)}
        </div>
        <p className="text-center text-xs text-slate-500 mt-4 max-w-xl mx-auto">Free edition: your camera, screen, chat, raised hands and attendance are fully live. Classmates appear with their face check-in photo and live status (streaming everyone's video to each other needs a paid media server, so it is the one thing kept out to stay 100% free).</p>
        <div className="absolute bottom-24 inset-x-0 pointer-events-none">{floats.map(f => { const I = REACTIONS[f.kind] || ThumbsUp; return <span key={f.id} className="reaction-float absolute bg-white text-indigo-600 p-2.5 rounded-full shadow-xl" style={{ left: f.left + '%' }}><I size={20} /></span>; })}</div>
      </main>
      {panel && <aside className="w-[320px] max-w-[88vw] shrink-0 border-l border-white/10 bg-slate-900 flex flex-col max-md:absolute max-md:right-0 max-md:top-[57px] max-md:bottom-0 max-md:z-20">
        <div className="flex border-b border-white/10">{[['chat', 'Chat', MessagesSquare], ['people', `People (${people.length})`, Users], ['poll', 'Poll', BarChart3], ['board', 'Whiteboard', PenTool]].map(([k, l, I]: any) => <button key={k} onClick={() => setPanel(k)} className={`flex-1 py-3 text-xs font-extrabold inline-flex justify-center items-center gap-1.5 ${panel === k ? 'text-white border-b-2 border-indigo-500' : 'text-slate-400'}`}><I size={14} />{l}</button>)}</div>
        {panel === 'chat' && <><div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin">{chatMsgs.length === 0 ? <p className="text-slate-500 text-sm text-center mt-6">No messages yet — say hello to your class.</p> : chatMsgs.map(m => <div key={m.id} className={m.user_id === user.id ? 'text-right' : ''}><p className="text-[11px] text-slate-500 font-semibold">{m.user_id === user.id ? 'You' : m.user_name}</p><span className={`inline-block mt-0.5 px-3 py-2 rounded-2xl text-sm text-left ${m.user_id === user.id ? 'bg-indigo-600 rounded-br-md' : 'bg-white/10 rounded-bl-md'}`}>{m.content}</span></div>)}<div ref={chatEndRef} /></div><form onSubmit={sendMsg} className="p-3 border-t border-white/10 flex gap-2"><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Message the class…" className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" /><button className="bg-indigo-600 p-2.5 rounded-full shrink-0"><Send size={17} /></button></form></>}
        {panel === 'people' && <div className="flex-1 overflow-y-auto p-3.5 space-y-1">{people.map(p => <div key={p.id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5">{p.face_image_url || p.avatar_url ? <img src={p.face_image_url || p.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" /> : <span className="w-10 h-10 rounded-full bg-slate-700 grid place-items-center text-sm font-extrabold">{initials(p.user_name)}</span>}<span className="flex-1 min-w-0"><span className="block text-sm font-bold truncate">{p.user_name}{p.user_id === user.id ? ' (you)' : ''}</span><span className="block text-[11px] text-slate-500 capitalize">{p.role} · {p.face_verified ? 'Face verified' : 'No face check-in'}</span></span>{p.hand_raised && <Hand size={17} className="text-amber-300" />}{p.mic_on === false ? <MicOff size={16} className="text-rose-300" /> : <Mic size={16} className="text-emerald-300" />}</div>)}</div>}
        {panel === 'poll' && <div className="flex-1 overflow-y-auto p-3.5">{activePoll ? <div><p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wide">{activePoll.status === 'open' ? 'Live poll' : 'Poll closed'}</p><h4 className="font-extrabold mt-1">{activePoll.question}</h4>
          {(() => { const total = pollVotes.length || 1; const mine = pollVotes.find((v: any) => v.user_id === user.id); return <div className="mt-3 space-y-2">{(activePoll.options || []).map((opt: string, i: number) => { const count = pollVotes.filter((v: any) => v.option_index === i).length; const pct = Math.round((count / total) * 100); return <button key={i} disabled={!isTeacherSession && activePoll.status !== 'open'} onClick={() => votePoll(i)} className={`w-full text-left rounded-xl border px-3 py-2.5 relative overflow-hidden ${mine?.option_index === i ? 'border-indigo-400' : 'border-white/10'}`}><span className="absolute inset-y-0 left-0 bg-indigo-600/30" style={{ width: pct + '%' }} /><span className="relative flex justify-between items-center text-sm"><span className="font-semibold">{opt}{mine?.option_index === i && <Check size={13} className="inline ml-1.5 text-emerald-300" />}</span><span className="text-xs text-slate-300">{count} · {pct}%</span></span></button>; })}</div>; })()}
          <p className="text-[11px] text-slate-500 mt-3">{pollVotes.length} vote{pollVotes.length === 1 ? '' : 's'} so far{activePoll.status !== 'open' ? ' — poll closed' : ''}</p>
          {isTeacherSession && activePoll.status === 'open' && <button onClick={closePoll} className="mt-3 w-full bg-white/10 hover:bg-white/20 text-sm font-bold py-2 rounded-full">Close poll</button>}
          {isTeacherSession && activePoll.status !== 'open' && <button onClick={() => setActivePoll(null)} className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-sm font-bold py-2 rounded-full">New poll</button>}
        </div> : isTeacherSession ? <div><h4 className="font-extrabold flex items-center gap-2"><BarChart3 size={18} className="text-indigo-300" /> Start a live poll</h4><input value={pollDraft.question} onChange={e => setPollDraft({ ...pollDraft, question: e.target.value })} placeholder="Ask your class a question…" className="w-full mt-3 bg-white/10 rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="mt-2.5 space-y-2">{pollDraft.options.map((o, i) => <div key={i} className="flex gap-1.5"><input value={o} onChange={e => { const opts = [...pollDraft.options]; opts[i] = e.target.value; setPollDraft({ ...pollDraft, options: opts }); }} placeholder={`Option ${i + 1}`} className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />{pollDraft.options.length > 2 && <button onClick={() => setPollDraft({ ...pollDraft, options: pollDraft.options.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-rose-300 px-1"><X size={15} /></button>}</div>)}</div>
          {pollDraft.options.length < 5 && <button onClick={() => setPollDraft({ ...pollDraft, options: [...pollDraft.options, ''] })} className="mt-2 text-xs font-bold text-indigo-300 inline-flex items-center gap-1"><Plus size={13} /> Add option</button>}
          <button onClick={createPoll} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold py-2.5 rounded-full">Launch poll</button>
        </div> : <p className="text-slate-500 text-sm text-center mt-6">No live poll right now — your teacher can start one anytime.</p>}</div>}
        {panel === 'board' && <div className="flex-1 flex flex-col p-3"><div className="flex items-center gap-2 mb-2.5">{['#4f46e5','#0d9488','#e11d48','#d97706','#0f172a'].map(c => <button key={c} onClick={() => { setColor(c); setErase(false); }} className={`w-7 h-7 rounded-full ring-2 ${color === c && !erase ? 'ring-white' : 'ring-transparent'}`} style={{ background: c }} />)}<button onClick={() => setErase(!erase)} className={`ml-1 p-2 rounded-full ${erase ? 'bg-indigo-600' : 'bg-white/10'}`} title="Eraser"><Eraser size={15} /></button><button onClick={clearBoard} className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full">Clear</button></div><canvas ref={boardRef} width={600} height={700} onMouseDown={boardDown} onMouseMove={boardMove} onMouseUp={() => drawingRef.current = false} onMouseLeave={() => drawingRef.current = false} onTouchStart={boardDown} onTouchMove={boardMove} onTouchEnd={() => drawingRef.current = false} className="flex-1 w-full bg-white rounded-2xl touch-none cursor-crosshair" /><p className="text-[11px] text-slate-500 mt-2">Draw or write to think things through. Screen-share to show it big.</p></div>}
      </aside>}
    </div>
    <footer className="border-t border-white/10 px-3 py-3.5 flex items-end justify-center gap-2.5 sm:gap-4 flex-wrap">
      <Ctrl onClick={toggleMic} active={!mic} label={mic ? 'Mute' : 'Unmute'}>{mic ? <Mic size={21} /> : <MicOff size={21} />}</Ctrl>
      <Ctrl onClick={toggleCam} active={!cam} label={cam ? 'Camera off' : 'Camera on'}>{cam ? <Video size={21} /> : <VideoOff size={21} />}</Ctrl>
      <Ctrl onClick={shareScreen} active={sharing} label={sharing ? 'Stop share' : 'Share screen'}><MonitorUp size={21} /></Ctrl>
      <Ctrl onClick={toggleHand} active={hand} label={hand ? 'Lower hand' : 'Raise hand'}><Hand size={21} /></Ctrl>
      <Ctrl onClick={toggleRecord} active={recording} label={recording ? 'Stop & save' : 'Record'}>{recording ? <Square size={19} /> : <Circle size={19} />}</Ctrl>
      <span className="hidden md:flex items-center gap-1.5 pb-5">{Object.keys(REACTIONS).map(k => { const I = REACTIONS[k]; return <button key={k} onClick={() => react(k)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full" title="Send reaction"><I size={16} /></button>; })}</span>
      <Ctrl onClick={() => setPanel(panel === 'chat' ? '' : 'chat')} active={panel === 'chat'} label="Chat"><MessagesSquare size={21} /></Ctrl>
      <Ctrl onClick={() => setPanel(panel === 'people' ? '' : 'people')} active={panel === 'people'} label="People"><Users size={21} /></Ctrl>
      <Ctrl onClick={() => setPanel(panel === 'poll' ? '' : 'poll')} active={panel === 'poll'} label="Poll">{activePoll && activePoll.status === 'open' ? <span className="relative"><BarChart3 size={21} /><span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full live-dot" /></span> : <BarChart3 size={21} />}</Ctrl>
      <Ctrl onClick={() => setPanel(panel === 'board' ? '' : 'board')} active={panel === 'board'} label="Whiteboard"><PenTool size={20} /></Ctrl>
      <Ctrl onClick={leave} danger label="Leave"><PhoneOff size={21} /></Ctrl>
    </footer>
  </div>;
}
