// Dedicated read-only tunnel target. Never tunnel the operator server (8787) or Ollama.
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {sanitizeSnapshot} from './public-snapshot.mjs';
export function createViewerServer({factoryUrl='http://127.0.0.1:8787',allowedOrigin='https://andreatsilva.github.io',request=fetch,now=Date.now}={}){
 const upstream=new URL(factoryUrl),origin=new URL(allowedOrigin);
 if(upstream.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(upstream.hostname)||upstream.username||upstream.password||upstream.pathname!=='/'||upstream.search||upstream.hash)throw Error('Factory upstream must be a loopback HTTP origin');
 if(origin.origin!==allowedOrigin||!['https:','http:'].includes(origin.protocol)||(origin.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(origin.hostname)))throw Error('Set one exact HTTPS Pages origin');
 let cache=null,cachedAt=0,pending=null;
 const snapshot=async()=>{
  if(cache&&now()-cachedAt<2000)return cache;
  if(!pending)pending=(async()=>{const r=await request(new URL('/api/public/snapshot',upstream),{signal:AbortSignal.timeout(5000),redirect:'error'});if(!r.ok)throw Error('Factory offline');const value=sanitizeSnapshot(await r.json());if(Math.abs(now()-value.generatedAt)>30000)throw Error('Stale factory state');cache=value;cachedAt=now();return value;})().finally(()=>{pending=null;});
  return pending;
 };
 const server=http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});res.end(data===undefined?'':JSON.stringify(data));};
  if(req.url!=='/snapshot')return send(404,{error:'Not found'});
  if(req.headers.origin&&req.headers.origin!==allowedOrigin)return send(403,{error:'Origin not allowed'});
  if(req.headers.origin===allowedOrigin)res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
  if(req.method==='OPTIONS'){if(req.headers['access-control-request-method']&&req.headers['access-control-request-method']!=='GET')return send(405,{error:'Read-only feed'});res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');return send(204);}
  if(req.method!=='GET')return send(405,{error:'Read-only feed'});
  try{return send(200,await snapshot());}catch{return send(503,{error:'Factory offline or snapshot unavailable'});}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.maxHeadersCount=30;
 return server;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const port=Number(process.env.VIEWER_PORT)||8788;
 const server=createViewerServer({factoryUrl:process.env.FACTORY_LOCAL_URL,allowedOrigin:process.env.PAGES_ORIGIN});
 server.listen(port,'127.0.0.1',()=>console.log('Read-only factory feed: http://127.0.0.1:'+port+'/snapshot\nTunnel only this port. Operator controls remain on 8787.'));
 for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>server.close(()=>process.exit(0)));
}
