const fail=(status,message)=>Object.assign(Error(message),{status});
const actions={start:'/api/factory/start',stop:'/api/factory/stop',research:'/api/business/research',cycle:'/api/business/cycle',config:'/api/business/config',crew:'/api/crew',layout:'/api/layout'};
const configKeys=['continuousProduction','maxConcurrentJobs','maxAgents','dailyBudget','hourlyAIBudget','researchIntervalMs','priceDiscount'];
export function validateOperatorAction(action,body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw fail(400,'Expected an action object');
 const keys=Object.keys(body),only=allowed=>{if(keys.some(k=>!allowed.includes(k)))throw fail(400,'Unexpected action fields');};
 if(['start','stop','research','cycle'].includes(action)){only([]);return body;}
 if(action==='config'){only(configKeys);if(!keys.length)throw fail(400,'No settings supplied');for(const [k,v]of Object.entries(body))if(typeof v!=='number'||!Number.isFinite(v))throw fail(400,'Settings must be numeric');return body;}
 if(action==='crew'){only(['department','target']);if(!['research','website','quality','product','sales','thumbnails'].includes(body.department)||!Number.isInteger(body.target)||body.target<0||body.target>124)throw fail(400,'Choose a department and a crew size of 0–124');return body;}
 if(action==='layout'){only(['action','side','type','id','revision']);if(!Number.isInteger(body.revision)||body.revision<0||!['add','remove'].includes(body.action))throw fail(400,'Invalid layout revision/action');if(body.action==='add'&&(!['north','south','east','west'].includes(body.side)||!['workshop','storage','servers'].includes(body.type)))throw fail(400,'Invalid expansion bay');if(body.action==='remove'&&(typeof body.id!=='string'||!/^bay-(north|south|east|west)-[0-7]$/.test(body.id)))throw fail(400,'Invalid bay');return body;}
 throw fail(404,'Unknown operator action');
}
export function createOperatorGateway({auth,upstream,request=fetch,allowedOrigin,now=Date.now,audit=()=>{}}){
 let mutationPending=false,statePending=null,reads=[],writes=[];
 const fetchJson=async(path,body)=>{
  const r=await request(new URL(path,upstream),{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(45000)});
  const value=await r.json();if(!r.ok)throw fail([400,404,409,429,503].includes(r.status)?r.status:503,typeof value.error==='string'?value.error.slice(0,300):'Factory request failed');return value;
 };
 const state=()=>{
  if(!statePending)statePending=Promise.all(['/api/status','/api/business','/api/crew','/api/layout'].map(p=>fetchJson(p))).then(([status,business,crew,layout])=>({
   generatedAt:now(),running:status.factory_running,stopping:status.stopping,ai:{reachable:status.local_ai.reachable,busy:status.local_ai.busy,missing:status.local_ai.missing},
   production:business.production,config:Object.fromEntries(configKeys.map(k=>[k,business.config[k]])),mode:business.mode,
   counts:{products:business.products.length,queued:business.summary.queued,listings:business.summary.listings},
   products:business.products.slice(0,100).map(p=>({id:p.id,title:p.title,status:p.status,qualityScore:p.qualityScore,priceCents:p.priceCents})),
   sources:business.sources.slice(0,4).map(s=>({provider:s.provider,status:s.status,created:s.created,error:s.error})),crew,layout
  })).finally(()=>{statePending=null;});return statePending;
 };
 return async(req,res,send)=>{
  if(!req.url.startsWith('/operator/'))return false;
  const action=req.url.startsWith('/operator/action/')?req.url.slice('/operator/action/'.length):'';
  if(!['/operator/login','/operator/verify','/operator/mfa','/operator/mfa/setup','/operator/mfa/confirm','/operator/mfa/cancel','/operator/logout','/operator/logout-all','/operator/state'].includes(req.url)&&!Object.hasOwn(actions,action)){send(404,{error:'Unknown operator route'});return true;}
  // Exact browser origin is an additional guard. Authentication is always required.
  if(req.headers.origin!==allowedOrigin){send(403,{error:'Operator origin not allowed'});return true;}
  res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
  const method=['/operator/state','/operator/mfa'].includes(req.url)?'GET':'POST';
  if(req.method==='OPTIONS'){if(req.headers['access-control-request-method']!==method){send(405,{error:'Method not allowed'});return true;}res.setHeader('Access-Control-Allow-Methods',method);res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');send(204);return true;}
  if(req.method!==method){send(405,{error:'Method not allowed'});return true;}
  try{
   if(!['/operator/login','/operator/verify'].includes(req.url))auth.authorize(req.headers.authorization);
   if(req.url==='/operator/mfa')return send(200,auth.security(req.headers.authorization)),true;
   if(req.url==='/operator/state'){
    reads=reads.filter(t=>now()-t<60000);if(reads.length>=30)throw fail(429,'Refresh limit reached. Try again shortly.');reads.push(now());
    return send(200,await state()),true;
   }
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw fail(415,'Send application/json');
   if(Number(req.headers['content-length'])>8192)throw fail(413,'Request too large');
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192)throw fail(413,'Request too large');chunks.push(chunk);}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||Array.isArray(body)||typeof body!=='object')throw Error();}catch{throw fail(400,'Expected a JSON object');}
   if(req.url==='/operator/login')return send(200,await auth.login(body)),true;
   if(req.url==='/operator/verify')return send(200,auth.verify(body)),true;
   // Recheck after reading the body so an expired or revoked session cannot mutate state.
   auth.authorize(req.headers.authorization);
   if(req.url==='/operator/mfa/setup')return send(200,await auth.beginEnrollment(req.headers.authorization,body)),true;
   if(req.url==='/operator/mfa/confirm')return send(200,auth.confirmEnrollment(req.headers.authorization,body)),true;
   if(req.url==='/operator/mfa/cancel')return send(200,auth.cancelEnrollment(req.headers.authorization)),true;
   if(req.url==='/operator/logout'){auth.logout(req.headers.authorization);return send(200,{ok:true}),true;}
   if(req.url==='/operator/logout-all'){auth.revokeAll();return send(200,{ok:true}),true;}
   const payload=validateOperatorAction(action,body);
   writes=writes.filter(t=>now()-t<60000);if(writes.length>=12)throw fail(429,'Action limit reached. Try again shortly.');
   if(mutationPending)throw fail(409,'Wait for the current operator action to finish');
   mutationPending=true;writes.push(now());
   try{const result=await fetchJson(actions[action],payload);try{audit({at:new Date(now()).toISOString(),event:'action:'+action,status:200});}catch{}send(200,{ok:true,message:typeof result.message==='string'?result.message.slice(0,300):'Factory action saved'});}
   finally{mutationPending=false;}
  }catch(e){if(e.status===429)res.setHeader('Retry-After',req.url==='/operator/login'?'900':'60');send(e.status||503,{error:e.status?e.message:'Operator connection unavailable'});}
  return true;
 };
}
