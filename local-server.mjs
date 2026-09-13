import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const quotes = JSON.parse(fs.readFileSync(path.join(root, 'data/quotes-1330.json'), 'utf8'));
const port = Number(process.env.PORT || 8888);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
const headers = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type', 'Cache-Control':'no-store' };
const send = (res, status, body, type='application/json; charset=utf-8') => { res.writeHead(status, {...headers, 'Content-Type':type}); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
const serialize = quote => ({...quote, translation_rights:{owner:'Original translator credited in the cited source', status:'source-published-pending-rights-review', human_reviewed:false, ai_assisted:false}});
function api(res, url) {
  if (url.pathname === '/api/health') return send(res, 200, {status:'ok', service:'tamil-stoic-local-api', version:'1.0'});
  if (url.pathname !== '/api/quotes' && !url.pathname.startsWith('/api/quotes/')) return false;
  const id = url.pathname.startsWith('/api/quotes/') ? url.pathname.split('/').pop() : url.searchParams.get('id');
  if (id) { const quote=quotes.find(q=>q.id===id); return quote ? send(res,200,{data:serialize(quote),meta:{api_version:'1.0',corpus_status:'project-madurai-bilingual-pending-review'}}) : send(res,404,{error:{code:'NOT_FOUND',message:'Quote not found'}}); }
  const q=(url.searchParams.get('q')||'').toLowerCase(); const category=url.searchParams.get('category')||''; const work=(url.searchParams.get('work')||'').toLowerCase();
  const filtered=quotes.filter(item=>{const hay=[item.tamil.text,item.english.text,item.work.title,item.work.author,item.themes.join(' ')].join(' ').toLowerCase(); return (!q||hay.includes(q))&&(!category||item.themes.includes(category))&&(!work||item.work.title.toLowerCase().includes(work));});
  const limit=Math.min(Math.max(Number(url.searchParams.get('limit'))||20,1),100); const offset=Math.max(Number(url.searchParams.get('offset'))||0,0); const data=filtered.slice(offset,offset+limit); const next=offset+limit<filtered.length?String(offset+limit):null;
  return send(res,200,{data:data.map(serialize),page:{next_cursor:next,has_more:next!==null},meta:{api_version:'1.0',corpus_status:'project-madurai-bilingual-pending-review',total:filtered.length,generated_at:new Date().toISOString()}});
}
const server=http.createServer((req,res)=>{ if(req.method==='OPTIONS') return send(res,204,''); if(req.method!=='GET') return send(res,405,{error:{code:'METHOD_NOT_ALLOWED',message:'GET only'}}); const url=new URL(req.url,`http://${req.headers.host||'localhost'}`); if(url.pathname.startsWith('/api/')) return api(res,url); let file=url.pathname==='/'?'/index.html':url.pathname; const safe=path.normalize(file).replace(/^\.\.(\/|\\)/,''); const target=path.join(root,safe); if(!target.startsWith(root)||!fs.existsSync(target)||fs.statSync(target).isDirectory()) return send(res,404,'Not found','text/plain; charset=utf-8'); send(res,200,fs.readFileSync(target),mime[path.extname(target)]||'application/octet-stream'); });
server.listen(port,'0.0.0.0',()=>console.log(`Tamil Stoic local server: http://localhost:${port}`));
