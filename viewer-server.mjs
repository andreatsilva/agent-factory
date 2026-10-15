// Public feeds plus authenticated, allowlisted management. Never tunnel 8787 or Ollama.
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {existsSync,readFileSync,appendFileSync,statSync,renameSync} from 'node:fs';
import {createOperatorAuth} from './operator-auth.mjs';
import {createOperatorGateway} from './operator-gateway.mjs';
import {sanitizeSnapshot} from './public-snapshot.mjs';
import {sanitizePublicProducts} from './public-products.mjs';
import {parsePublicMessage} from './public-chat.mjs';
export function createViewerServer({factoryUrl='http://127.0.0.1:8787',allowedOrigin='https://andreatsilva.github.io',request=fetch,now=Date.now,operatorRecord=null,audit=()=>{}}={}){
 const upstream=new URL(factoryUrl),origin=new URL(allowedOrigin);
 if(upstream.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(upstream.hostname)||upstream.username||upstream.password||upstream.pathname!=='/'||upstream.search||upstream.hash)throw Error('Factory upstream must be a loopback HTTP origin');
 if(origin.origin!==allowedOrigin||!['https:','http:'].includes(origin.protocol)||(origin.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(origin.hostname)))throw Error('Set one exact HTTPS Pages origin');
 const operator=createOperatorGateway({auth:createOperatorAuth({record:operatorRecord,now,audit}),upstream,request,allowedOrigin,now,audit});
 let cache=null,cachedAt=0,pending=null,chatPending=false,chatAttempts=[];
 let productCache=null,productsAt=0,productsPending=null;
 const products=async()=>{
  if(productCache&&now()-productsAt<10000)return productCache;
  if(!productsPending)productsPending=(async()=>{const r=await request(new URL('/api/public/products',upstream),{signal:AbortSignal.timeout(5000),redirect:'error'});if(!r.ok)throw Error('Catalog offline');const value=sanitizePublicProducts(await r.json());if(Math.abs(now()-value.generatedAt)>30000)throw Error('Stale catalog');productCache=value;productsAt=now();return value;})().finally(()=>{productsPending=null;});
  return productsPending;
 };
 const snapshot=async()=>{
  if(cache&&now()-cachedAt<2000)return cache;
  if(!pending)pending=(async()=>{const r=await request(new URL('/api/public/snapshot',upstream),{signal:AbortSignal.timeout(5000),redirect:'error'});if(!r.ok)throw Error('Factory offline');const value=sanitizeSnapshot(await r.json());if(Math.abs(now()-value.generatedAt)>30000)throw Error('Stale factory state');cache=value;cachedAt=now();return value;})().finally(()=>{pending=null;});
  return pending;
 };
 const server=http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});res.end(data===undefined?'':JSON.stringify(data));};
  if(await operator(req,res,send))return;
  if(!['/snapshot','/chat','/products'].includes(req.url))return send(404,{error:'Not found'});
  if(req.headers.origin&&req.headers.origin!==allowedOrigin)return send(403,{error:'Origin not allowed'});
  if(req.headers.origin===allowedOrigin)res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
  const method=req.url==='/chat'?'POST':'GET';
  if(req.method==='OPTIONS'){if(req.headers['access-control-request-method']&&req.headers['access-control-request-method']!==method)return send(405,{error:'Method not allowed'});res.setHeader('Access-Control-Allow-Methods',method+', OPTIONS');if(method==='POST')res.setHeader('Access-Control-Allow-Headers','Content-Type');return send(204);}
  if(req.url==='/chat'){
   if(req.method!=='POST')return send(405,{error:'Use POST for public conversation'});
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(415,{error:'Send application/json'});
   chatAttempts=chatAttempts.filter(t=>now()-t<3600000);
   if(chatAttempts.length>=60||chatAttempts.filter(t=>now()-t<60000).length>=6){res.setHeader('Retry-After','60');return send(429,{error:'Public chat is resting. Please try again later.'});}
   if(chatPending)return send(409,{error:'NEO is answering another visitor. Please try again shortly.'});
   chatPending=true;chatAttempts.push(now());
   try{
    if(Number(req.headers['content-length'])>8192)return send(413,{error:'Message too large'});
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>8192)return send(413,{error:'Message too large'});chunks.push(chunk);}
    let message;try{message=parsePublicMessage(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{return send(400,{error:'Use a message up to 600 characters and at most six recent turns'});}
    const r=await request(new URL('/api/public/chat',upstream),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(message),redirect:'error',signal:AbortSignal.timeout(55000)});
    if(!r.ok){const status=[400,409,429,503].includes(r.status)?r.status:503;return send(status,{error:status===409?'NEO is busy or the factory is in gaming mode. Please try again later.':status===429?'Public chat is resting. Please try again later.':'NEO is unavailable. Please try again shortly.'});}
    const data=await r.json();if(data.mode!=='conversation-only'||typeof data.reply!=='string'||!data.reply.trim())throw Error('Invalid reply');
    return send(200,{reply:data.reply.slice(0,1800),mode:'conversation-only'});
   }catch{return send(503,{error:'NEO could not reply. Please try again shortly.'});}
   finally{chatPending=false;}
  }
  if(req.method!=='GET')return send(405,{error:'Read-only feed'});
  if(req.url==='/products'){try{return send(200,await products());}catch{return send(503,{error:'Product catalog unavailable'});}}
  try{return send(200,await snapshot());}catch{return send(503,{error:'Factory offline or snapshot unavailable'});}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.maxHeadersCount=30;
 return server;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const port=Number(process.env.VIEWER_PORT)||8788;
 const data=join(dirname(fileURLToPath(import.meta.url)),'data'),recordPath=join(data,'operator-auth.json'),auditPath=join(data,'operator-audit.jsonl');
 // Missing credentials disable management; invalid credentials fail startup closed.
 const operatorRecord=existsSync(recordPath)?JSON.parse(readFileSync(recordPath,'utf8')):null;
 const audit=event=>{if(existsSync(auditPath)&&statSync(auditPath).size>1048576)renameSync(auditPath,auditPath+'.previous');appendFileSync(auditPath,JSON.stringify(event)+'\n',{mode:0o600});};
 const server=createViewerServer({factoryUrl:process.env.FACTORY_LOCAL_URL,allowedOrigin:process.env.PAGES_ORIGIN,operatorRecord,audit});
 server.listen(port,'127.0.0.1',()=>console.log('Factory gateway: http://127.0.0.1:'+port+'\nTunnel only this port. Authenticated operator management: '+(operatorRecord?'enabled':'disabled')));
 for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>server.close(()=>process.exit(0)));
}
