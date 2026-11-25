import supabase from './db-client.js';
import { awardXP } from './_gamification.js';
import { auraConfigured, checkProof } from './_aurascan.js';
// When AuraScan is switched on, "face verified" is decided on the server: it needs a
// valid AuraScan check-in proof (api/aurascan.js) for this user and this lesson.
// Without AuraScan settings everything works exactly as before.
const faceOk=(b)=>auraConfigured()?checkProof(b.aura_proof,b.user_id,b.session_id):!!b.face_verified;
const cors=(req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');if(req.method==='OPTIONS'){res.status(204).end();return true;}return false;};
export default async function handler(req,res){if(cors(req,res))return;try{
 if(req.method==='GET'){let q=supabase.from('attendance').select('*').order('joined_at',{ascending:true});if(req.query.session_id)q=q.eq('session_id',req.query.session_id);if(req.query.class_id)q=q.eq('class_id',req.query.class_id);if(req.query.user_id)q=q.eq('user_id',req.query.user_id);const{data,error}=await q;if(error)throw error;return res.status(200).json(data);}
 if(req.method==='POST'){const b=req.body||{};const{data:ex}=await supabase.from('attendance').select('*').eq('session_id',b.session_id).eq('user_id',b.user_id).maybeSingle();if(ex){const{data,error}=await supabase.from('attendance').update({face_verified:auraConfigured()?(ex.face_verified||faceOk(b)):(b.face_verified??ex.face_verified),face_image_url:b.face_image_url||ex.face_image_url,last_seen:new Date().toISOString(),mic_on:b.mic_on??ex.mic_on,cam_on:b.cam_on??ex.cam_on}).eq('id',ex.id).select().single();if(error)throw error;return res.status(200).json(data);}const{data,error}=await supabase.from('attendance').insert({session_id:b.session_id,class_id:b.class_id,user_id:b.user_id,user_name:b.user_name,role:b.role||'student',face_verified:faceOk(b),face_image_url:b.face_image_url||'',avatar_url:b.avatar_url||'',status:'present',hand_raised:false,mic_on:true,cam_on:true,last_seen:new Date().toISOString()}).select().single();if(error)throw error;const verifiedNow=!!data.face_verified;
  // First time joining this session earns XP toward the global leaderboard,
  // streaks and badges \u2014 more for a real face-verified check-in.
  let gamification=null;try{gamification=await awardXP(supabase,{user_id:b.user_id,user_name:b.user_name,avatar_url:b.avatar_url,role:b.role,amount:verifiedNow?25:15,patch:{classes_attended:1,face_verified_count:verifiedNow?1:0}});}catch(e){console.error('xp award failed',e);}
  return res.status(201).json({...data,gamification});}
 if(req.method==='PUT'){const{id,session_id,user_id,...f}=req.body||{};const clean={last_seen:new Date().toISOString()};['hand_raised','mic_on','cam_on','status',...(auraConfigured()?[]:['face_verified'])].forEach(k=>{if(f[k]!==undefined)clean[k]=f[k];});let q=supabase.from('attendance').update(clean);if(id)q=q.eq('id',id);else q=q.eq('session_id',session_id).eq('user_id',user_id);const{data,error}=await q.select().maybeSingle();if(error)throw error;return res.status(200).json(data||{ok:true});}
 res.status(405).json({error:'Method not allowed'});}catch(err){res.status(500).json({error:err.message});}}
