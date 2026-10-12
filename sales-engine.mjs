import {randomUUID,createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {makeZip,crc32} from './zip.mjs';
import {renderSalesBrief} from './sales-renderer.mjs';
const fault=(status,message)=>Object.assign(Error(message),{status});
const txt=(v,name,max,optional=false)=>{if(typeof v!=='string'||(!optional&&!v.trim())||v.length>max)throw fault(400,name+' is required, maximum '+max+' characters');return v.trim();};
export const THUMBNAIL_OFFER={id:'text-thumbnail-pair',name:'Text-led thumbnail pair',deliverables:['Two original 1280 × 720 PNG compositions','Brief and delivery notes'],requirements:['Short headline','Brand or channel name','Optional subtitle and accent colour'],scope:'Text and geometric artwork only. No photographic retouching, AI image generation, logos or performance guarantees.',revisions:1,deliveryHours:48,connected:false};
export function checkPng(buffer){
 const b=Buffer.from(buffer);if(b.length<57||b.length>1500000||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw fault(400,'Invalid PNG');
 let at=8,header=false,end=false,channels=0;const parts=[];
 while(at+12<=b.length){const n=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8),start=at+8,stop=start+n;if(stop+4>b.length||crc32(b.subarray(at+4,stop))!==b.readUInt32BE(stop))throw fault(400,'PNG integrity check failed');
  if(!header&&type!=='IHDR')throw fault(400,'Missing PNG header');
  if(type==='IHDR'){if(header||n!==13||b.readUInt32BE(start)!==1280||b.readUInt32BE(start+4)!==720||b[start+8]!==8||![2,6].includes(b[start+9])||b[start+10]||b[start+11]||b[start+12])throw fault(400,'Expected non-interlaced 1280 × 720 RGB/RGBA PNG');header=true;channels=b[start+9]===6?4:3;}
  if(type==='IDAT')parts.push(b.subarray(start,stop));at=stop+4;if(type==='IEND'){if(n)throw fault(400,'Invalid PNG end');end=true;break;}
 }
 if(!header||!end||at!==b.length||!parts.length)throw fault(400,'Incomplete PNG');
 try{const raw=inflateSync(Buffer.concat(parts),{maxOutputLength:720*(1280*channels+1)});if(raw.length!==720*(1280*channels+1))throw Error();for(let y=0;y<720;y++)if(raw[y*(1280*channels+1)]>4)throw Error();}catch{throw fault(400,'PNG pixel data is invalid');}
 return b;
}
export function createSalesEngine({db,ensureRunning,log,render=renderSalesBrief,clock=Date.now,retryDelayMs=5000,onEvent=()=>{},prepare=async()=>{},onFinish=()=>{}}){
 db.exec('CREATE TABLE IF NOT EXISTS sales_cases(id TEXT PRIMARY KEY,data TEXT NOT NULL);CREATE TABLE IF NOT EXISTS sales_artifacts(case_id TEXT NOT NULL,version INTEGER NOT NULL,package BLOB NOT NULL,PRIMARY KEY(case_id,version));');
 const get=id=>{const r=db.prepare('SELECT data FROM sales_cases WHERE id=?').get(id);if(!r)throw fault(404,'Unknown sales case');return JSON.parse(r.data);};
 const save=c=>{c.updatedAt=new Date().toISOString();db.prepare('INSERT INTO sales_cases VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(c.id,JSON.stringify(c));return c;};
 const event=(c,action)=>{c.history.push({at:new Date().toISOString(),action,state:c.state,version:c.version});log('Sales Ops // LOCAL '+action+' · '+c.client);onEvent(c,action);};
 let active=null;
 const rows=()=>db.prepare('SELECT data FROM sales_cases ORDER BY rowid').all().map(r=>JSON.parse(r.data));
 const resetQueue=c=>{c.production={attempts:0,failures:0,nextAttemptAt:null,error:null};};
 for(const c of rows())if(c.state==='PRODUCING'){c.state='QUEUED';event(c,'Interrupted production recovered after restart');save(c);}
 const brief=b=>({headline:txt(b.headline??'','Headline',55),brand:txt(b.brand??'','Brand',35),subtitle:txt(b.subtitle??'','Subtitle',85,true),accent:/^#[\da-f]{6}$/i.test(b.accent||'')?b.accent:'#dca747'});
 function overview(){const cases=rows().reverse();let running=true;try{ensureRunning();}catch{running=false;}return {mode:'LOCAL_REHEARSAL',production:{automatic:true,running,concurrency:1,activeCaseId:active?.id||null},offer:THUMBNAIL_OFFER,connections:{upwork:'NOT_CONNECTED',freelancer:'NOT_CONNECTED',fiverr:'NOT_CONNECTED'},cases,summary:{total:cases.length,queued:cases.filter(c=>c.state==='QUEUED').length,producing:cases.filter(c=>c.state==='PRODUCING').length,failed:cases.filter(c=>c.state==='PRODUCTION_FAILED').length,review:cases.filter(c=>c.state==='REVIEW_REQUIRED').length,ready:cases.filter(c=>['DELIVERY_READY','HANDOFF_PREPARED'].includes(c.state)).length,realRevenue:0}};}
 function create(body){
  const client=txt(body.client,'Client label',100),request=txt(body.request,'Request',1500),id='SC-'+randomUUID();
  const c={id,client,request,mode:'LOCAL_REHEARSAL',offerId:THUMBNAIL_OFFER.id,state:'NEEDS_BRIEF',brief:null,history:[],version:0,revisions:0,createdAt:new Date().toISOString()};
  if(body.requiresCall===true||body.unlimitedRevisions===true){c.state='DECLINED';c.reason='Outside low-contact scope: calls or unlimited revisions requested';}
  else try{c.brief=brief(body);c.state='QUALIFIED';}catch(e){if(e.status!==400)throw e;c.reason=e.message;}
  event(c,'Case created');return save(c);
 }
 function action(id,body){
  const c=get(id),allowed=(states)=>{if(!states.includes(c.state))throw fault(409,'Action not available from '+c.state);};
  if(body.expectedVersion!==undefined&&body.expectedVersion!==c.version)throw fault(409,'Artifact changed; refresh before reviewing or changing the order');
  if(body.action==='brief'){allowed(['NEEDS_BRIEF','QUALIFIED']);c.brief=brief(body);c.state='QUALIFIED';c.reason=null;}
  else if(body.action==='proposal'){
   allowed(['QUALIFIED']);const quote=body.quote??25,cost=body.cost??10,fee=body.feePercent??20;
   if(![quote,cost,fee].every(Number.isFinite)||quote<=0||quote>10000||cost<0||cost>10000||fee<0||fee>40)throw fault(400,'Invalid planning economics');
   const quoteCents=Math.round(quote*100),costCents=Math.round(cost*100),feeCents=Math.ceil(quoteCents*fee/100),net=quoteCents-feeCents-costCents;if(net<quoteCents*.3)throw fault(400,'Quote must leave at least 30% estimated margin after cost and fee reserve');
   c.proposal={quoteCents,costCents,feePercent:fee,estimatedMarginCents:net,note:'Planning assumptions, not platform fees or verified profit',text:`Hello ${c.client}, I can prepare two text-led 1280 × 720 thumbnail options for “${c.brief.headline}”, using ${c.brief.brand} and original geometric artwork. Scope: PNG files, one consolidated revision, delivery within 48 hours after a complete brief and confirmed order. No call required. Photographic editing and performance guarantees are excluded. Proposed price: EUR ${(quoteCents/100).toFixed(2)}.`};c.state='PROPOSAL_DRAFT';
  }else if(body.action==='approve-local'){allowed(['PROPOSAL_DRAFT']);c.state='QUEUED';c.localOrderAt=new Date().toISOString();}
  else if(body.action==='qa'){allowed(['REVIEW_REQUIRED']);if(typeof body.passed!=='boolean')throw fault(400,'Record a visual review result');const note=txt(body.note,'Review note',500);c.qa={...c.qa,visualPassed:body.passed,visualNote:note,reviewedAt:new Date().toISOString()};c.state=body.passed?'DELIVERY_READY':'NEEDS_CORRECTION';}
  else if(body.action==='correction'){allowed(['NEEDS_CORRECTION']);const revised=brief({...c.brief,...body});if(JSON.stringify(revised)===JSON.stringify(c.brief))throw fault(400,'Change the brief before reproducing a rejected composition');c.brief=revised;c.state='QUEUED';}
  else if(body.action==='retry-production'){allowed(['PRODUCTION_FAILED']);c.state='QUEUED';}
  else if(body.action==='revision'){allowed(['DELIVERY_READY','HANDOFF_PREPARED']);if(c.revisions>=1)throw fault(409,'Included revision already used; prepare a new scope');const note=txt(body.note,'Revision note',500);c.brief=brief({...c.brief,...body});c.revisions++;c.revisionNote=note;c.state='QUEUED';c.qa=null;c.handoff=null;}
  else if(body.action==='handoff'){allowed(['DELIVERY_READY']);c.handoff={text:`Prepared locally: two thumbnail PNGs for ${c.brief.brand}. ${c.revisions?'The included revision has been used.':'One consolidated revision is included.'} Please review the attached files.`,sent:false};c.state='HANDOFF_PREPARED';}
  else if(body.action==='close-local'){allowed(['HANDOFF_PREPARED']);c.state='CLOSED_LOCAL';}
  else throw fault(400,'Unknown workflow action');
  if(c.state==='QUEUED')resetQueue(c);
  event(c,body.action);return save(c);
 }
 function produce(id,body,claim=null){
  ensureRunning();const c=get(id);if(claim?c.state!=='PRODUCING'||c.production?.claim!==claim:c.state!=='QUEUED')throw fault(409,'Approve a local order before production; an active worker owns its claim');
  if(body.expectedVersion!==c.version)throw fault(409,'Order changed; refresh before producing');
  if(!Array.isArray(body.images)||body.images.length!==2)throw fault(400,'Two thumbnail PNGs required');
  const pngs=body.images.map(v=>{if(typeof v!=='string'||v.length>2000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(v))throw fault(400,'Invalid image encoding');return checkPng(Buffer.from(v,'base64'));});
  if(pngs[0].equals(pngs[1]))throw fault(400,'Two distinct compositions required');
  c.version++;c.state='REVIEW_REQUIRED';c.qa={structuralPassed:true,dimensions:'1280 × 720',files:2,visualPassed:null};
  const renderer=claim?'server-canvas-text-compositor-v1':'canvas-text-compositor-v1';
  c.production={...c.production,claim:null,error:null,nextAttemptAt:null,completedAt:new Date().toISOString(),renderer};
  const files={'thumbnail-a.png':pngs[0],'thumbnail-b.png':pngs[1],'brief.json':JSON.stringify(c.brief,null,2),'README.txt':`LOCAL REHEARSAL — ${c.client}\nTwo text-led thumbnail compositions. ${renderer}; original geometric artwork. No photographic or AI-generated images.\nHeadline: ${c.brief.headline}\nBrand: ${c.brief.brand}\nOne revision included. No real client acceptance, payment or external delivery recorded.\n`,'manifest.json':JSON.stringify({caseId:c.id,version:c.version,renderer,images:pngs.map(b=>({sha256:createHash('sha256').update(b).digest('hex'),width:1280,height:720}))},null,2)};
  db.exec('BEGIN');try{db.prepare('INSERT INTO sales_artifacts VALUES(?,?,?)').run(c.id,c.version,makeZip(files));event(c,'Production complete; visual QA required');save(c);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return c;
 }
 function artifact(id,version){const c=get(id),v=version===undefined?c.version:Number(version);if(!Number.isInteger(v)||v<1)throw fault(404,'No artifact');const r=db.prepare('SELECT package FROM sales_artifacts WHERE case_id=? AND version=?').get(id,v);if(!r)throw fault(404,'No artifact');return {case:c,version:v,package:r.package};}
 function tick(){
  if(active)return active.promise;
  try{ensureRunning();}catch{return Promise.resolve();}
  const c=rows().find(c=>c.state==='QUEUED'&&(!c.production?.nextAttemptAt||Date.parse(c.production.nextAttemptAt)<=clock()));
  if(!c)return Promise.resolve();
  const claim=randomUUID(),controller=new AbortController();
  c.state='PRODUCING';c.production={...c.production,attempts:(c.production?.attempts||0)+1,claim,startedAt:new Date().toISOString()};event(c,'Automatic server production started');save(c);
  const job={id:c.id,controller,promise:null};active=job;
  job.promise=(async()=>{
   try{
    await prepare(c,controller.signal);
    const images=await render(c.brief,controller.signal);
    controller.signal.throwIfAborted();ensureRunning();
    produce(c.id,{images,expectedVersion:c.version},claim);
   }catch(e){
    const current=get(c.id);if(current.state!=='PRODUCING'||current.production?.claim!==claim)return;
    current.production.claim=null;
    if(controller.signal.aborted){current.state='QUEUED';event(current,'Production paused; queued for resume');}
    else{
     const failures=(current.production.failures||0)+1;
     current.production={...current.production,failures,error:String(e.message||e).slice(0,500),nextAttemptAt:new Date(clock()+retryDelayMs*failures).toISOString()};
     current.state=failures>=3?'PRODUCTION_FAILED':'QUEUED';event(current,failures>=3?'Production failed after three attempts':'Production failed; retry scheduled');
    }
    save(current);
   }finally{onFinish(c,get(c.id).state==='REVIEW_REQUIRED');if(active===job)active=null;}
  })();
  return job.promise;
 }
 async function pause(){const job=active;if(job){job.controller.abort();await job.promise;}}
 return {overview,create,action,produce,artifact,tick,pause};
}
