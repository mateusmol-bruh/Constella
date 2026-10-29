const {createHash}=require('node:crypto');
module.exports=function memoria(user='1') {
 const rows=new Map();const hash=s=>createHash('sha256').update(s).digest('hex');
 const base=(id,jti)=>({id:hash(jti),tipo:'usuaria',id_usr:BigInt(id),id_mod:null,ultima_atividade:new Date(),expira_em:new Date(Date.now()+3600000),revogada_em:null});
 rows.set(hash('a'.repeat(64)),base(user,'a'.repeat(64)));rows.set(hash('b'.repeat(64)),base('2','b'.repeat(64)));
 return {async create({data}){const row={ultima_atividade:new Date(),revogada_em:null,...data};rows.set(data.id,row);return row;},async findUnique({where}){return rows.get(where.id)||null;},async updateMany({where,data}){const r=rows.get(where.id);if(!r)return {count:0};Object.assign(r,data);return {count:1};},rows};
};
