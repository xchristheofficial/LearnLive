import supabase from './db-client.js';
const cors=(req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');if(req.method==='OPTIONS'){res.status(204).end();return true;}return false;};
export default async function handler(req,res){if(cors(req,res))return;try{
 if(req.method==='GET'){let q=supabase.from('messages').select('*').order('created_at',{ascending:true});if(req.query.session_id)q=q.eq('session_id',req.query.session_id);if(req.query.class_id)q=q.eq('class_id',req.query.class_id);const{data,error}=await q.limit(300);if(error)throw error;return res.status(200).json(data);}
 if(req.method==='POST'){const b=req.body||{};const{data,error}=await supabase.from('messages').insert({session_id:b.session_id||null,class_id:b.class_id||null,user_id:b.user_id,user_name:b.user_name,content:b.content,msg_type:b.msg_type||'chat'}).select().single();if(error)throw error;return res.status(201).json(data);}
 res.status(405).json({error:'Method not allowed'});}catch(err){res.status(500).json({error:err.message});}}
