import supabase from './db-client.js';
const cors=(req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');if(req.method==='OPTIONS'){res.status(204).end();return true;}return false;};
export default async function handler(req,res){if(cors(req,res))return;try{
 if(req.method==='GET'){let q=supabase.from('polls').select('*').order('created_at',{ascending:false});if(req.query.session_id)q=q.eq('session_id',req.query.session_id);const{data,error}=await q.limit(20);if(error)throw error;return res.status(200).json(data);}
 if(req.method==='POST'){const b=req.body||{};const{data,error}=await supabase.from('polls').insert({session_id:b.session_id,class_id:b.class_id,question:b.question,options:b.options||[],status:'open'}).select().single();if(error)throw error;return res.status(201).json(data);}
 if(req.method==='PUT'){const{id,status}=req.body||{};const{data,error}=await supabase.from('polls').update({status:status||'closed'}).eq('id',id).select().single();if(error)throw error;return res.status(200).json(data);}
 res.status(405).json({error:'Method not allowed'});}catch(err){res.status(500).json({error:err.message});}}
