import {createHash,randomUUID} from 'node:crypto';
import {sourceAdapters,evaluateMarket,manufacturingBrief} from './research.mjs';
import {buildProduct,qualityCheck} from './manufacturing.mjs';
const stamp=()=>new Date().toISOString();
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,12);
export function migratePipeline(db){
 db.exec(`CREATE TABLE IF NOT EXISTS source_cache(url TEXT PRIMARY KEY,body TEXT NOT NULL,expires_at INTEGER NOT NULL,collected_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS source_runs(id TEXT PRIMARY KEY,adapter TEXT NOT NULL,state TEXT NOT NULL,count INTEGER NOT NULL,error TEXT,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS research_evidence(id TEXT PRIMARY KEY,candidate_id TEXT NOT NULL,data TEXT NOT NULL,collected_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS candidate_decisions(id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT NOT NULL,decision TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS product_specs(id TEXT PRIMARY KEY,candidate_id TEXT NOT NULL UNIQUE,brief TEXT NOT NULL,status TEXT NOT NULL,guide TEXT,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS qa_reports(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,attempt INTEGER NOT NULL,passed INTEGER NOT NULL,report TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS llm_usage(id TEXT PRIMARY KEY,model TEXT NOT NULL,prompt_tokens INTEGER,output_tokens INTEGER,duration_ns INTEGER,created_at TEXT NOT NULL);`);
 for(const [table,column,type] of [['opportunities','analysis','TEXT'],['opportunities','decision',"TEXT NOT NULL DEFAULT 'legacy'"],['products','package','BLOB'],['products','spec_id','TEXT'],['products','qa_status',"TEXT NOT NULL DEFAULT 'legacy'"]])if(!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
 // Preserve old prototypes and orders, but do not claim they passed the expanded quality gate.
 db.prepare("UPDATE products SET status='review_required' WHERE qa_status='legacy' AND status='published'").run();
}
export function createPipeline({db,env,request,generate,aiStatus,jobStage,ensureRunning,log}){
 async function readPublic(url,ttl,job){
  ensureRunning();const cache=db.prepare('SELECT * FROM source_cache WHERE url=?').get(url);if(cache&&cache.expires_at>Date.now())return cache.body;
  let last;for(let attempt=1;attempt<=2;attempt++){
   try{const response=await request(url,{headers:{'User-Agent':'NEO-Factory/1.0 (local metadata research)'},signal:AbortSignal.any([job.controller.signal,AbortSignal.timeout(20000)])});if(!response.ok){if([401,403,429].includes(response.status))throw Object.assign(Error('Source access/rate limit: '+response.status),{noRetry:true});throw Error('Source HTTP '+response.status);}const body=await response.text();if(body.length>2000000)throw Object.assign(Error('Source exceeds metadata size limit'),{noRetry:true});db.prepare('INSERT INTO source_cache VALUES(?,?,?,?) ON CONFLICT(url) DO UPDATE SET body=excluded.body,expires_at=excluded.expires_at,collected_at=excluded.collected_at').run(url,body,Date.now()+ttl,stamp());return body;}catch(e){last=e;ensureRunning();if(e.noRetry||job.controller.signal.aborted)throw e;if(attempt<2)log('NEO retries source once: '+new URL(url).host,'warn');}
  }throw last;
 }
 async function research(job){
  jobStage(job,'research','Research Lab: gathering priced digital-product formats and supporting discussions');
  const signals=[];for(const adapter of sourceAdapters){
   ensureRunning();try{const rows=await adapter.collect({getText:(url,ttl)=>readPublic(url,ttl,job),getJson:async(url,ttl)=>JSON.parse(await readPublic(url,ttl,job))});signals.push(...rows);db.prepare('INSERT INTO source_runs VALUES(?,?,?,?,?,?)').run(randomUUID(),adapter.id,'completed',rows.length,null,stamp());log(adapter.id+': '+rows.length+' public metadata signals');}catch(e){ensureRunning();db.prepare('INSERT INTO source_runs VALUES(?,?,?,?,?,?)').run(randomUUID(),adapter.id,'failed',0,e.message,stamp());log(adapter.id+': '+e.message,'warn');}
  }
  if(!signals.length)throw Error('No research adapter returned real source evidence.');
  jobStage(job,'validation','NEO: evaluating digital format, paid references, effort, support and €20 fit',50);
  const {candidate,rejected}=evaluateMarket(signals),id='OP-'+hash(candidate.key);
  // Cache reasoning by evidence fingerprint; do not spend tokens rereading unchanged listings.
  const fingerprint=hash(JSON.stringify(candidate.evidence)),prior=db.prepare('SELECT analysis FROM opportunities WHERE id=?').get(id);
  const previous=prior?.analysis?JSON.parse(prior.analysis):null;let reviewer='deterministic evidence gate';
  if(candidate.decision==='approved'){
   if(previous?.fingerprint===fingerprint&&previous.neo_review){candidate.neo_review=previous.neo_review;reviewer=previous.reviewer||'qwen3:8b';}
   else {const status=await aiStatus();if(status.reachable&&!status.missing.includes(status.neo_model))try{
    const brief=manufacturingBrief(candidate),summary={product:brief.name,buyer:brief.target_buyer,problem:brief.problem,features:brief.required_features,price_eur:20,paid_top_seller_references:candidate.evidence.map(e=>({title:e.title,price:e.price,currency:e.currency,rank:e.rank})),unknowns:candidate.unknowns};
    const review=await generate(status.neo_model,'Assess this ORIGINAL digital product format based only on observed facts. Do not infer sales counts or complaints. Return JSON {approved:boolean, reason:string, neo_score:number}. Approve only a useful narrow original offline utility at EUR20. References are formats to learn from, not material to copy. '+JSON.stringify(summary),true,job.controller.signal);
    if(typeof review.approved!=='boolean'||typeof review.reason!=='string'||!Number.isFinite(review.neo_score))throw Error('Invalid NEO decision schema');candidate.neo_review=review;reviewer=status.neo_model;
   }catch(e){ensureRunning();log('NEO review deferred: '+e.message,'warn');candidate.decision='needs_review';candidate.reason='Local NEO validation is unavailable; retain evidence without publishing.';}
   else{candidate.decision='needs_review';candidate.reason='Local NEO model unavailable; evidence retained for later validation.';}}
   if(candidate.neo_review){candidate.neo_score=Math.max(0,Math.min(100,Math.round(candidate.neo_review.neo_score)));if(!candidate.neo_review.approved||candidate.neo_score<60){candidate.decision='rejected';candidate.reason=candidate.neo_review.reason;}else candidate.reason+=' NEO: '+candidate.neo_review.reason;}
  }
  candidate.fingerprint=fingerprint;candidate.reviewer=reviewer;
  ensureRunning();db.prepare(`INSERT INTO opportunities(id,title,url,source,summary,neo_score,demand_score,pain_score,margin_score,reviewer,created_at,analysis,decision) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET summary=excluded.summary,neo_score=excluded.neo_score,demand_score=excluded.demand_score,reviewer=excluded.reviewer,analysis=excluded.analysis,decision=excluded.decision`).run(id,candidate.title,candidate.source_url,'Modular digital-product research',candidate.reason,candidate.neo_score,candidate.demand_score,60,candidate.price_suitability,reviewer,stamp(),JSON.stringify(candidate),candidate.decision);
  for(const evidence of [...candidate.evidence,...candidate.discussion])db.prepare('INSERT INTO research_evidence VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,collected_at=excluded.collected_at').run('EV-'+hash(id+evidence.url),id,JSON.stringify(evidence),stamp());
  for(const item of [...rejected,{title:candidate.title,url:candidate.source_url,reason:candidate.reason,decision:candidate.decision}])db.prepare('INSERT INTO candidate_decisions VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET decision=excluded.decision,reason=excluded.reason,created_at=excluded.created_at').run('CD-'+hash(item.url),item.title,item.url,item.decision||'rejected',item.reason,stamp());
  log(`NEO ${candidate.decision}: ${candidate.title} — ${candidate.reason}`);return signals.length;
 }
 async function productize(job){
  const rows=db.prepare("SELECT o.* FROM opportunities o LEFT JOIN products p ON p.opportunity_id=o.id WHERE o.decision='approved' AND p.id IS NULL ORDER BY o.neo_score DESC LIMIT 2").all();let count=0;
  for(const o of rows){
   const candidate=JSON.parse(o.analysis),brief=manufacturingBrief(candidate),specId='SP-'+o.id.slice(3),productId='PF-'+o.id.slice(3);
   jobStage(job,'brief','NEO: handing an original, evidence-linked manufacturing brief to the builder',100);
   db.prepare('INSERT INTO product_specs(id,candidate_id,brief,status,created_at) VALUES(?,?,?,?,?) ON CONFLICT(candidate_id) DO UPDATE SET brief=excluded.brief').run(specId,o.id,JSON.stringify(brief),'building',stamp());
   let guide;const saved=db.prepare('SELECT guide FROM product_specs WHERE id=?').get(specId);if(saved.guide)guide=JSON.parse(saved.guide);
   jobStage(job,'building','Builder: creating the original sprite utility, export logic and documentation',0);
   if(!guide){const status=await aiStatus();if(status.reachable&&!status.missing.includes(status.coder_model))for(let attempt=1;attempt<=2;attempt++)try{
    const result=await generate(status.coder_model,'Write a short practical quick-start guide for our implemented original product. Return JSON {steps:[5 concise strings]}. Follow only these features; do not tell users to build or buy a competitor. '+JSON.stringify({name:brief.name,features:brief.required_features,files:brief.expected_files,offline:true}),true,job.controller.signal);
    if(!Array.isArray(result.steps)||result.steps.length!==5||!result.steps.every(s=>typeof s==='string'&&s.length>20&&s.length<700))throw Error('Quick-start schema invalid');guide=result;break;
   }catch(e){ensureRunning();log(`NEO builder retry ${attempt}/2: ${e.message}`,'warn');}
   if(!guide){guide={steps:['Open workbench.html locally in a current browser; no installation or login is required.','Load the original demo or import your own licensed PNG, JPEG or WebP sprite sheet.','Set whole-pixel frame width, height, margins and spacing, then apply the grid.','Select a frame and export its PNG; export the JSON atlas to preserve all frame coordinates.','Extract and export palette colors, then complete the asset register and release checklist.'],model:'deterministic original documentation'};log('Using checked original documentation; no fabricated AI output','warn');}
   db.prepare('UPDATE product_specs SET guide=? WHERE id=?').run(JSON.stringify(guide),specId);}
   ensureRunning();let product,qa;
   for(let attempt=1;attempt<=2;attempt++){
    product=buildProduct(brief,guide);jobStage(job,'quality',`Quality Control: package, exports, calculations, originality and ZIP checks (${attempt}/2)`,50);
    qa=qualityCheck(brief,product);db.prepare('INSERT INTO qa_reports VALUES(?,?,?,?,?,?)').run(randomUUID(),productId,attempt,Number(qa.passed),JSON.stringify(qa),stamp());
    if(qa.passed)break;log('NEO rejected package for rework: '+qa.checks.filter(c=>!c.passed).map(c=>c.name).join(', '),'warn');guide=null;
   }
   if(!qa.passed){db.prepare("UPDATE product_specs SET status='qa_failed' WHERE id=?").run(specId);throw Error('Product failed quality checks; retained as a draft, not published.');}
   jobStage(job,'publishing','Store Relay: publishing the verified original ZIP at exactly €20',100);
   db.prepare('INSERT INTO products(id,opportunity_id,name,summary,category,status,price_cents,artifact,created_at,package,spec_id,qa_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(productId,o.id,brief.name,'Offline sprite sheet slicing, individual PNG frames, JSON atlas, palette analysis and export, asset register and release checklist. No login or upload.','Offline digital utility','published',2000,product.html,stamp(),product.zip,specId,'passed');
   db.prepare("UPDATE product_specs SET status='published' WHERE id=?").run(specId);count++;log('Published original '+productId+' with a validated ZIP');
  }return count;
 }
 return {research,productize};
}
