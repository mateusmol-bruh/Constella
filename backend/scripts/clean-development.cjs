const path = require('node:path');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
const { Client } = require('pg');
const order = ['denuncia_mensagem','denuncia_postagem','denuncia_usuaria','denuncia','usuaria_conteudo','usuaria_conteudo_pro','usuaria_interesses','usuaria_forum','mensagem','postagem','chat','conexao','assinatura','forum','relatorio_moderacao','usuaria'];
const catalog = ['interesses','conteudo','conteudo_interesses','conteudo_pro'];
const all = [...order,...catalog,'moderadora'];
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function run() {
  const url = new URL(process.env.DATABASE_URL);
  if (process.env.NODE_ENV !== 'development' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw Error('Limpeza restrita ao banco local de desenvolvimento.');
  const client = new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
  const apply = process.argv.includes('--apply');
  let committed = false;
  try {
    await client.connect();
    const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(x=>x.tablename);
    if (tables.some(name=>!all.includes(name)&&name!=='_prisma_migrations') || all.some(name=>!tables.includes(name))) throw Error('Estrutura inesperada. Revisar antes de limpar.');
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await client.query("SET LOCAL lock_timeout='5s'");
    if (apply) await client.query(`LOCK TABLE ${all.map(name=>`public."${name}"`).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
    async function counts() {
      const result={};
      for(const name of all) result[name]=(await client.query(`SELECT COUNT(*)::int AS n FROM public."${name}"`)).rows[0].n;
      return result;
    }
    async function structure() {
      const columns=await client.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
      const constraints=await client.query("SELECT conrelid::regclass::text AS tabela,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conname");
      const migrations=await client.query('SELECT migration_name,checksum,finished_at FROM public._prisma_migrations ORDER BY migration_name');
      return digest([columns.rows,constraints.rows,migrations.rows]);
    }
    const before=await counts();
    const schemaBefore=await structure();
    if (!apply) {
      await client.query('ROLLBACK');
      console.log(JSON.stringify({dryRun:true,before,deleteOrder:order,preserve:catalog,moderators:'Preservar moderadoras do seed e autoras de conteúdo; remover somente excedentes sem referências.'},null,2));
      return;
    }
    const deleted={};
    for(const name of order) deleted[name]=(await client.query(`DELETE FROM public."${name}"`)).rowCount;
    deleted.moderadora=(await client.query("DELETE FROM public.moderadora m WHERE m.email_mod <> ALL($1::text[]) AND NOT EXISTS(SELECT 1 FROM public.conteudo c WHERE c.id_mod=m.id_mod)",[['ana@constella.dev','julia@constella.dev']])).rowCount;
    const after=await counts();
    if(order.some(name=>after[name]!==0)||catalog.some(name=>after[name]!==before[name])||after.moderadora<1) throw Error('Conferência de limpeza falhou. Transação revertida.');
    const schemaAfter=await structure();
    if(schemaBefore!==schemaAfter) throw Error('Estrutura alterada inesperadamente. Transação revertida.');
    const report={executedAt:new Date().toISOString(),before,deleted,after,schemaUnchanged:true,identitySequencesReset:false,preserved:catalog,moderators:'Seed e responsáveis por conteúdo preservadas.'};
    await client.query('COMMIT');
    committed = true;
    fs.writeFileSync(path.resolve(__dirname,'../../docs/LIMPEZA_BANCO_2026-10-23.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    // Não imprimir conexão, SQL nem dados individuais.
    console.error(committed ? 'Limpeza confirmada no banco; falhou a gravação do relatório. Consulte as contagens antes de repetir.' : error.code ? `Limpeza falhou: ${error.code}. Nenhuma alteração parcial confirmada.` : error.message);
    process.exitCode=1;
  } finally { await client.end(); }
}
run().catch(()=>{console.error('Configuração inválida para limpeza local.');process.exitCode=1;});
