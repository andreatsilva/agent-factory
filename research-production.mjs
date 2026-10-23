import {APP_PROFILES,sourceIdentity,canonicalSource} from './product-strategy.mjs';
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
 const available=r=>r.type!=='image'||imageAvailable();
 // Audit earlier queue entries without deleting their completed deliverables.
 for(const r of rows().filter(r=>!r.relevanceVersion)){
  r.relevanceVersion=1;r.evidenceStatus=hasResearchCoverage(relevantResearchReferences(r.type,r.evidence))?'FORMAT_REFERENCES':'NEEDS_RESEARCH_REVIEW';
  if(r.evidenceStatus==='NEEDS_RESEARCH_REVIEW'&&r.status!=='COMPLETE')r.status='NEEDS_RESEARCH_REVIEW';save(r);
 }
 for(const r of rows().filter(r=>!r.researchSpec&&['QUEUED','FAILED'].includes(r.status))){r.status='NEEDS_RESEARCH_REVIEW';r.error='A source-specific capability brief is required by the new production policy';save(r);}
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
  const round=Math.floor(saved.sequence/types.length),variant=type==='app'?Object.keys(APP_PROFILES)[round%Object.keys(APP_PROFILES).length]:type;
  const audiences=topics[type];
  // Rotate even when a query fails. Never retry the first exhausted audience forever.
  const niche=type==='app'?['personal use','small teams','freelancers','students'][Math.floor(round/Object.keys(APP_PROFILES).length)%4]:audiences[round%audiences.length];
  const next={sequence:saved.sequence+1,nextAt:Date.now()+60000};
  db.prepare("INSERT INTO settings VALUES('creative_discovery',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(next));
  if(type==='app'&&rows().some(r=>r.type==='app'&&r.researchSpec?.variant===variant&&r.niche===niche)){log('Research Lab // skipped an existing '+variant+' workflow for '+niche);return 0;}
  ensureRunning();job.controller.signal.throwIfAborted();jobStage(job,'research',`Research Lab // finding ${type} product opportunities for ${niche}`);
  const discovery=await research(type,niche,{signal:job.controller.signal,variant});
  ensureRunning();job.controller.signal.throwIfAborted();
  const references=relevantResearchReferences(type,discovery.references,variant);
  const pageVerified=discovery.status==='PRODUCT_PAGES_READ'&&references.some(r=>r.basis?.startsWith('Public product page read live'));
  if(!pageVerified&&!hasResearchCoverage(references))throw Error('Research Lab needs a readable product page or relevant product-format references from at least two websites before queuing a product');
  const previous=rows(),source=references.find(ref=>!previous.some(r=>r.type===type&&(r.researchSpec?.variant||r.type)===variant&&canonicalSource(r.researchSpec?.source?.url||r.evidence?.[0]?.url)===canonicalSource(ref.url)));
  if(!source){log('Research Lab // skipped repeated '+variant+' references; awaiting a new product source');return 0;}
  const identity=sourceIdentity(type,variant,source.url),id='CR-'+identity;
  const profile=APP_PROFILES[variant];
  const researchSpec={version:2,type,variant,identity,source:{url:source.url,title:source.title},features:profile?.features||[type+' design pack'],difference:profile?.difference||'Original compositions, typography and palette adapted to '+niche+'. No source artwork or branding reused.',evidenceStatus:pageVerified?'OBSERVED_LISTING':'SEARCH_EXCERPTS',limitations:'Public references describe the product format; our scope is the listed subset, not full feature parity. Demand and pricing have not been verified.'};
  const row={id,productId:'ST-'+identity,type,niche,status:'QUEUED',createdAt:new Date().toISOString(),discovery:{...discovery,references},evidence:references,researchSpec,relevanceVersion:2,evidenceStatus:'FORMAT_REFERENCES',qualification:pageVerified?'Product page read live and checked for the supported capability. Demand and prices are not verified.':'Product-format references from two or more websites. This audience is a hypothesis; demand and prices are not verified.'};
  save(row);log(`Research Lab // FOUND ${type}: ${niche} → production queue (${references.length} references)`);return 1;
 }
 return {rows,pending,discover,finish};
}
