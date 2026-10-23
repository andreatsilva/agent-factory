import {createHash} from 'node:crypto';
import {STUDIO_TYPES} from './studio-products.mjs';
import {relevantResearchReferences,hasResearchCoverage} from './creative-research.mjs';

// These are search topics, not evidence of demand. Only successful web research
// enters the production queue; the original source excerpts remain private.
const topics={
 thumbnail:['cooking tutorial channels','home workout channels','indie game review channels','science education channels'],
 logo:['independent coffee shops','pet grooming businesses','garden maintenance businesses','handmade ceramics studios'],
 app:['student study sessions','freelance project planning','home decluttering routines','daily writing practice'],
 image:['space exploration education','sustainable city living','wildlife conservation','botanical gardening']
};
export function createResearchProduction({db,research,imageAvailable,ensureRunning,jobStage,log}){
 db.exec('CREATE TABLE IF NOT EXISTS creative_research_queue(id TEXT PRIMARY KEY,data TEXT NOT NULL)');
 const rows=()=>db.prepare('SELECT data FROM creative_research_queue ORDER BY rowid').all().map(r=>JSON.parse(r.data));
 const save=r=>db.prepare('INSERT INTO creative_research_queue VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(r.id,JSON.stringify(r));
 const productId=(type,niche)=>'ST-'+createHash('sha256').update(type+'|'+niche).digest('hex').slice(0,24);
 const available=r=>r.type!=='image'||imageAvailable();
 // Audit earlier queue entries without deleting their completed deliverables.
 for(const r of rows().filter(r=>!r.relevanceVersion)){
  r.relevanceVersion=1;r.evidenceStatus=hasResearchCoverage(relevantResearchReferences(r.type,r.evidence))?'FORMAT_REFERENCES':'NEEDS_RESEARCH_REVIEW';
  if(r.evidenceStatus==='NEEDS_RESEARCH_REVIEW'&&r.status!=='COMPLETE')r.status='NEEDS_RESEARCH_REVIEW';save(r);
 }
 // Recover the hand-off after interruption, including a crash after saving a ZIP.
 for(const r of rows().filter(r=>['QUEUED','PRODUCING'].includes(r.status))){
  const p=db.prepare('SELECT data,package FROM studio_products WHERE id=?').get(r.productId);
  r.status=p?.package&&JSON.parse(p.data).status==='READY'?'COMPLETE':'QUEUED';save(r);
 }
 const pending=()=>rows().filter(r=>(r.status==='QUEUED'||(r.status==='FAILED'&&(r.attempts||0)<3&&Date.now()>=(r.nextRetryAt||0)))&&available(r));
 function finish(r,status,error){
  Object.assign(r,{status,error:error||null,updatedAt:new Date().toISOString()});
  if(status==='PRODUCING')r.attempts=(r.attempts||0)+1;
  if(status==='QUEUED')r.attempts=Math.max(0,(r.attempts||0)-1);
  if(status==='FAILED')r.nextRetryAt=Date.now()+300000;
  save(r);
 }
 async function discover(job){
  if(pending().length>=4)return 0;
  const saved=JSON.parse(db.prepare("SELECT value FROM settings WHERE key='creative_discovery'").get()?.value||'{"sequence":0,"nextAt":0}');
  if(Date.now()<saved.nextAt)return 0;
  const types=STUDIO_TYPES.filter(t=>t!=='image'||imageAvailable()),type=types[saved.sequence%types.length];
  const savedAudiences=db.prepare("SELECT data FROM business_opportunities WHERE mode='LIVE' ORDER BY rowid DESC LIMIT 500").all().map(r=>JSON.parse(r.data)).filter(o=>!o.simulated&&o.evidence?.length).map(o=>o.niche);
  const audiences=[...new Set([...topics[type],...savedAudiences])];
  const known=new Set(rows().map(r=>r.productId));
  const niche=audiences.find(n=>!known.has(productId(type,n))&&!db.prepare('SELECT id FROM studio_products WHERE id=?').get(productId(type,n)));
  const next={sequence:saved.sequence+1,nextAt:Date.now()+60000};
  db.prepare("INSERT INTO settings VALUES('creative_discovery',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(next));
  if(!niche){log('Research Lab // '+type+' search topics exhausted; awaiting new audiences');return 0;}
  ensureRunning();job.controller.signal.throwIfAborted();jobStage(job,'research',`Research Lab // finding ${type} product opportunities for ${niche}`);
  const discovery=await research(type,niche,{signal:job.controller.signal});
  ensureRunning();job.controller.signal.throwIfAborted();
  const references=relevantResearchReferences(type,discovery.references);
  if(!hasResearchCoverage(references))throw Error('Research Lab needs relevant product-format references from at least two websites before queuing a product');
  const id='CR-'+productId(type,niche).slice(3),row={id,productId:productId(type,niche),type,niche,status:'QUEUED',createdAt:new Date().toISOString(),discovery:{...discovery,references},evidence:references,relevanceVersion:1,evidenceStatus:'FORMAT_REFERENCES',qualification:'Product-format references from two or more websites. This audience is a hypothesis; demand and prices are not verified.'};
  save(row);log(`Research Lab // FOUND ${type}: ${niche} → production queue (${references.length} references)`);return 1;
 }
 return {rows,pending,discover,finish};
}
