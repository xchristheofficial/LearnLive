import supabase from './db-client.js';
const cors=(req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');if(req.method==='OPTIONS'){res.status(204).end();return true;}return false;};
export default async function handler(req,res){if(cors(req,res))return;try{
 if(req.method==='GET'){let q=supabase.from('face_verifications').select('*').order('verified_at',{ascending:false});if(req.query.user_id)q=q.eq('user_id',req.query.user_id);const{data,error}=await q.limit(30);if(error)throw error;return res.status(200).json(data);}
 if(req.method==='POST'){const b=req.body||{};const{data,error}=await supabase.from('face_verifications').insert({user_id:b.user_id,user_name:b.user_name||'',photo_url:b.photo_url||'',matched:b.matched===undefined?null:!!b.matched,match_score:b.score===undefined||b.score===null?null:b.score}).select().single();if(error)throw error;return res.status(201).json(data);}
 res.status(405).json({error:'Method not allowed'});}catch(err){res.status(500).json({error:err.message});}}
