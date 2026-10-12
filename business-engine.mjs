import {validateBrief,assertDistinctBrief,plannerPrompt} from './product-planner.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {productPriceCents} from './market-pricing.mjs';
import {discoverMarket} from './market-discovery.mjs';
import {productPage} from './product-page.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import {DEFAULT_BUSINESS_CONFIG,validateConfig,normalizeOpportunity,opportunityFingerprint,scoreOpportunity,performanceDecision,euro} from './business-rules.mjs';
import {buildWebsite,websiteQA,WEBSITE_COMPONENTS} from './website-line.mjs';
import {MarketplaceAdapter,creationProviders} from './marketplace.mjs';
import {visitStation,positionAt,HUB} from './workers.mjs';
const stamp=()=>new Date().toISOString(),parse=row=>row?JSON.parse(row.data):null;
const fault=(status,message)=>Object.assign(Error(message),{status});
const caps=w=>w.capabilities||(w.id==='WC-04'?['website-template']:w.id==='WC-05'?['html-qa']:w.id==='WC-06'||w.id==='PF-01'?['listing-package']:w.id.startsWith('RL-')?['research']:['support']);
export function createBusinessEngine({db,request,workers,saveWorker,log,ensureRunning,jobStage,env={},options={}}){
 db.exec(`CREATE TABLE IF NOT EXISTS business_opportunities(id TEXT PRIMARY KEY,mode TEXT NOT NULL,fingerprint TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(mode,fingerprint));
 CREATE TABLE IF NOT EXISTS business_products(id TEXT PRIMARY KEY,opportunity_id TEXT NOT NULL UNIQUE,mode TEXT NOT NULL,data TEXT NOT NULL,package BLOB,html TEXT);
 CREATE TABLE IF NOT EXISTS business_listings(id TEXT PRIMARY KEY,product_id TEXT NOT NULL UNIQUE,mode TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS business_ledger(id TEXT PRIMARY KEY,mode TEXT NOT NULL,product_id TEXT,kind TEXT NOT NULL,amount_cents INTEGER NOT NULL,basis TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS business_orders(id TEXT PRIMARY KEY,mode TEXT NOT NULL,product_id TEXT NOT NULL,report_id TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS business_reports(id TEXT PRIMARY KEY,mode TEXT NOT NULL,product_id TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS business_decisions(id TEXT PRIMARY KEY,mode TEXT NOT NULL,product_id TEXT,data TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS business_qa(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS business_library(id TEXT PRIMARY KEY,kind TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS business_sources(id TEXT PRIMARY KEY,mode TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);`);
 const setting=(key,fallback)=>JSON.parse(db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value||JSON.stringify(fallback));
 const storeSetting=(key,v)=>db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(v));
 for(const row of db.prepare("SELECT * FROM business_reports WHERE mode='DEMO'").all()){const r=JSON.parse(row.data);for(let i=0;i<Math.min(r.orders,1000);i++){const id='DEMO:'+r.id+':order:'+i;db.prepare('INSERT OR IGNORE INTO business_orders VALUES(?,?,?,?,?,?)').run(id,'DEMO',row.product_id,r.id,JSON.stringify({id,productId:row.product_id,listingId:'BL-'+row.product_id,unitPrice:(r.unitPriceCents??2000)/100,currency:'EUR',status:'SIMULATED_PAID',simulated:true,source:r.source}),row.created_at);}}
 const config=()=>({...DEFAULT_BUSINESS_CONFIG,...setting('business_config',{})});
 const mode=()=>config().mode;
 function configure(patch){if(patch.mode&&patch.mode!==mode()&&db.prepare("SELECT id FROM jobs WHERE kind LIKE 'business%' AND state='paused'").get())throw Error('Resume the paused business cycle before switching modes');const next=validateConfig(config(),patch);storeSetting('business_config',next);log(`NEO // configuration saved · ${next.mode} · daily budget €${next.dailyBudget}`);return next;}
 for(const w of workers())saveWorker({...w,capabilities:['WC-02','WC-03'].includes(w.id)?[...new Set([...caps(w),'website-template'])]:caps(w),queue:w.queue||[],jobsCompleted:w.jobsCompleted||0,failures:w.failures||0,averageCost:w.averageCost||0,averageCompletionTime:w.averageCompletionTime||0,qualityAverage:w.qualityAverage||0});
 for(const id of WEBSITE_COMPONENTS)db.prepare('INSERT OR IGNORE INTO business_library VALUES(?,?,?)').run(id,'component',JSON.stringify({id,version:1,source:'original internal code',uses:0}));
 for(const [id,kind] of [['internal-website-template-v1','template'],['listing-art-v1','asset']])db.prepare('INSERT OR IGNORE INTO business_library VALUES(?,?,?)').run(id,kind,JSON.stringify({id,version:1,source:'original internal code',uses:0}));
 const list=(table,selected=mode())=>db.prepare(`SELECT * FROM ${table} WHERE mode=? ORDER BY rowid DESC`).all(selected).map(parse);
 const saveOpportunity=o=>db.prepare('INSERT INTO business_opportunities VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(o.id,o.mode,o.fingerprint,JSON.stringify(o));
 const getOpportunity=id=>parse(db.prepare('SELECT data FROM business_opportunities WHERE id=?').get(id));
 const getProduct=id=>parse(db.prepare('SELECT data FROM business_products WHERE id=?').get(id));
 const saveProduct=(p,artifact)=>db.prepare('INSERT INTO business_products VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,package=coalesce(excluded.package,package),html=coalesce(excluded.html,html)').run(p.id,p.opportunityId,p.mode,JSON.stringify(p),artifact?.zip||null,artifact?.html||null);
 const saveListing=l=>db.prepare('INSERT INTO business_listings VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(l.id,l.productId,l.mode,JSON.stringify(l));
 function importOpportunities(rows,source='manual'){
  if(!Array.isArray(rows)||rows.length<1||rows.length>50)throw fault(400,'Import 1–50 opportunities');
  let normalized;try{normalized=rows.map(row=>normalizeOpportunity(row,mode(),source));}catch(e){throw fault(400,e.message);}
  const result={created:0,duplicates:0,ids:[]};db.exec('BEGIN');try{
   for(const o of normalized){const fingerprint=opportunityFingerprint(o),id='BO-'+mode()+'-'+fingerprint;
    const existing=getOpportunity(id);if(existing){
     if(!db.prepare('SELECT id FROM business_products WHERE opportunity_id=?').get(id)&&o.priceEvidence.length){saveOpportunity({...existing,...o,updatedAt:stamp(),score:null,status:'DISCOVERED'});result.refreshed=(result.refreshed||0)+1;}
     result.duplicates++;result.ids.push(id);continue;
    }
    const record={...o,id,fingerprint,mode:mode(),createdAt:stamp(),score:null};saveOpportunity(record);result.created++;result.ids.push(id);
   }db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}return result;
 }
 function ledger({id,kind,amount=0,productId=null,basis,detail,selected=mode()}){
  if(!Number.isFinite(amount)||amount<0)throw fault(400,'Ledger amount must be nonnegative');
  db.prepare('INSERT OR IGNORE INTO business_ledger VALUES(?,?,?,?,?,?,?,?)').run(id,selected,productId,kind,Math.round(amount*100),basis|| (selected==='DEMO'?'simulated':'unpriced'),detail,stamp());
 }
 function spendAllowed(amount,{productId=null,kind='production',selected=mode()}={}){
  const c=config(),today=stamp().slice(0,10),sum=(where,args)=>db.prepare("SELECT coalesce(sum(amount_cents),0) n FROM business_ledger WHERE mode=? AND kind NOT IN ('revenue','refund') "+where).get(selected,...args).n/100;
  const daily=sum('AND substr(created_at,1,10)=?',[today]),product=productId?sum('AND product_id=?',[productId]):0;
  const hourlyAI=sum("AND kind='ai' AND created_at>=?",[new Date(Date.now()-3600000).toISOString()]);
  const limit=kind==='research'?c.maxResearchSpendPerOpportunity:kind==='revision'?c.maxAutomaticRevisionCost:c.maxCostPerProduct;
  if(c.dailyBudget===0||daily+amount>c.dailyBudget||amount>limit||(productId&&product+amount>c.maxCostPerProduct)||(kind==='ai'&&hourlyAI+amount>c.hourlyAIBudget))throw fault(409,'BUDGET LIMIT REACHED · NONESSENTIAL PRODUCTION PAUSED');
 }
 function charge(entry){if(db.prepare('SELECT id FROM business_ledger WHERE id=?').get(entry.id))return;spendAllowed(entry.amount,entry);ledger(entry);}
 const productRows=()=>list('business_products');
 function financial(selected=mode(),since=''){
  const rows=db.prepare('SELECT kind,basis,sum(amount_cents) cents,count(*) count FROM business_ledger WHERE mode=? AND created_at>=? GROUP BY kind,basis').all(selected,since);let revenue=0,cost=0,refunds=0,unpriced=0;
  for(const r of rows){if(r.kind==='revenue')revenue+=r.cents;else if(r.kind==='refund')refunds+=r.cents;else{cost+=r.cents;if(r.basis==='unpriced')unpriced+=r.count;}}
  return {revenue:revenue/100,cost:cost/100,refunds:refunds/100,netProfit:(revenue-refunds-cost)/100,unpricedCosts:unpriced,costCoverage:unpriced===0};
 }
 function metrics(productId){
  const p=getProduct(productId);if(!p)throw fault(404,'Unknown business product');
  const reports=db.prepare('SELECT * FROM business_reports WHERE product_id=? ORDER BY created_at,rowid').all(productId).map(parse);
  const m={views:0,clicks:0,messages:0,orders:0,refunds:0,marketplaceFees:0,revenue:0,lossWindows:0};
  for(const r of reports){for(const k of ['views','clicks','messages','orders'])m[k]+=r[k];}
  const rows=db.prepare('SELECT * FROM business_ledger WHERE product_id=?').all(productId);let costs=0,unpriced=0;
  for(const r of rows){if(r.kind==='revenue')m.revenue+=r.amount_cents/100;else if(r.kind==='refund')m.refunds+=r.amount_cents/100;else{costs+=r.amount_cents/100;if(r.basis==='unpriced')unpriced++;if(r.kind==='fee')m.marketplaceFees+=r.amount_cents/100;}}
  // Only independently identified reporting days can extend a loss streak.
  const days=new Map();for(const r of reports){const day=r.window.slice(0,10);days.set(day,(days.get(day)||0)+r.orders*(r.unitPriceCents??2000)/100-r.refunds-r.fees-r.supportCost);}
  for(const [,net] of [...days].sort(([a],[b])=>a.localeCompare(b)))m.lossWindows=net<0?m.lossWindows+1:0;
  return {...m,productionCost:euro(costs-m.marketplaceFees),cost:euro(costs),netProfit:euro(m.revenue-m.refunds-costs),conversionRate:m.views?m.orders/m.views:0,supportRate:m.orders?m.messages/m.orders:0,ageDays:(Date.now()-Date.parse(p.createdAt))/86400000,costCoverage:unpriced===0,reportCount:reports.length};
 }
 function recordMetrics(productId,report,source='manual'){
  if(!report||typeof report!=='object'||Array.isArray(report))throw fault(400,'Supply a sales report object');
  const p=getProduct(productId);if(!p||p.mode!==mode())throw fault(404,'Product not in the selected mode');
  if(!['LISTED','SELLING','PAUSED','KILLED'].includes(p.status))throw fault(409,'Product is not listed');
  if(source==='demo'&&p.mode!=='DEMO')throw fault(409,'Demo orders are forbidden in LIVE mode');
  if(typeof report.id!=='string'||!/^[\w-]{5,100}$/.test(report.id))throw fault(400,'Report requires a unique id');
  const prior=db.prepare('SELECT product_id,data FROM business_reports WHERE id=?').get(p.mode+':'+report.id);if(prior){if(prior.product_id!==productId)throw fault(409,'Report ID belongs to another product');const old=parse(prior);for(const k of ['views','clicks','messages','orders','refunds','fees','supportCost'])if((report[k]??0)!==old[k])throw fault(409,'Report ID already used with different metrics');return metrics(productId);}
  const r={id:report.id,unitPriceCents:productPriceCents(p),source,simulated:p.mode==='DEMO',window:report.window||stamp(),note:String(report.note||'').slice(0,500)};
  if(!Number.isFinite(Date.parse(r.window))||Date.parse(r.window)>Date.now()+60000)throw fault(400,'Reporting date must be valid and not in the future');
  for(const k of ['views','clicks','messages','orders','refunds','fees','supportCost']){r[k]=report[k]??0;if(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0||r[k]>1e6||(['views','clicks','messages','orders'].includes(k)&&!Number.isInteger(r[k])))throw fault(400,'Invalid metric '+k);}
  if(r.orders>1000)throw fault(400,'Maximum 1000 orders per report');
  if(r.clicks>r.views||r.orders>r.clicks||Math.round(r.refunds*100)>r.orders*r.unitPriceCents)throw fault(400,'Metrics must satisfy views ≥ clicks ≥ orders and refunds ≤ revenue');
  db.exec('BEGIN');try{
   db.prepare('INSERT INTO business_reports VALUES(?,?,?,?,?)').run(p.mode+':'+r.id,p.mode,p.id,JSON.stringify(r),stamp());
   if(p.mode==='DEMO')for(let i=0;i<r.orders;i++){const id=p.mode+':'+r.id+':order:'+i;db.prepare('INSERT OR IGNORE INTO business_orders VALUES(?,?,?,?,?,?)').run(id,p.mode,p.id,r.id,JSON.stringify({id,productId:p.id,listingId:'BL-'+p.id,unitPrice:(r.unitPriceCents??2000)/100,currency:'EUR',status:'SIMULATED_PAID',simulated:true,source:r.source}),stamp());}
   for(const [kind,amount]of [['revenue',r.orders*r.unitPriceCents/100],['refund',r.refunds],['fee',r.fees],['support',r.supportCost]])if(amount)ledger({id:p.mode+':'+r.id+':'+kind,kind,amount,productId:p.id,basis:p.mode==='DEMO'?'simulated':'manual-reported',detail:r.note||source+' reporting window',selected:p.mode});
   if(r.orders&&p.status==='LISTED'){p.status='SELLING';saveProduct(p);const o=getOpportunity(p.opportunityId);o.status='SELLING';saveOpportunity(o);}db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}return metrics(productId);
 }
 function recordCost(body){
  if(typeof body.id!=='string'||!/^[\w-]{5,100}$/.test(body.id)||!['hosting','advertising','api','ai','production','fee','other'].includes(body.kind)||typeof body.amount!=='number'||!Number.isFinite(body.amount)||body.amount<0||body.amount>100000||typeof body.detail!=='string'||!body.detail.trim())throw fault(400,'Supply a unique cost id, supported kind, nonnegative EUR amount and detail');
  if(body.productId&&getProduct(body.productId)?.mode!==mode())throw fault(404,'Product not in this mode');
  const id=mode()+':cost:'+body.id,prior=db.prepare('SELECT * FROM business_ledger WHERE id=?').get(id);if(prior&&(prior.kind!==body.kind||prior.amount_cents!==Math.round(body.amount*100)||(prior.product_id||null)!==(body.productId||null)))throw fault(409,'Cost ID already used');
  ledger({id,kind:body.kind,amount:body.amount,productId:body.productId||null,basis:mode()==='DEMO'?'simulated':'manual-reported',detail:body.detail.slice(0,500)});return financial();
 }
 function analyze(productId){
  const p=getProduct(productId),m=metrics(productId);if(p.mode!==mode())throw fault(404,'Product not in current mode');if(!['LISTED','SELLING','PAUSED','KILLED'].includes(p.status))throw fault(409,'Performance decisions require a listed product');
  if(p.status==='KILLED')return {action:'KILL',reason:'Product remains killed; retained for audit'};
  const decision=performanceDecision(m,config()),id='BD-'+p.id+'-'+decision.action+'-'+m.reportCount;
  if(db.prepare('SELECT id FROM business_decisions WHERE id=?').get(id))return decision;
  db.prepare('INSERT INTO business_decisions VALUES(?,?,?,?,?)').run(id,p.mode,p.id,JSON.stringify({...decision,metrics:m,productId:p.id}),stamp());
  if(['PAUSE','KILL'].includes(decision.action)){
   p.status=decision.action==='KILL'?'KILLED':'PAUSED';saveProduct(p);const o=getOpportunity(p.opportunityId);o.status=p.status;saveOpportunity(o);
   const l=parse(db.prepare('SELECT data FROM business_listings WHERE product_id=?').get(p.id));if(l)saveListing({...new MarketplaceAdapter(p.mode).pauseListing(l),id:l.id,mode:p.mode});
  }
  if(decision.action==='OPTIMIZE'){
   const l=parse(db.prepare('SELECT data FROM business_listings WHERE product_id=?').get(p.id));if(l)saveListing({...l,optimization:{title:p.title+' · editable, responsive & offline',reason:decision.reason},actionRequired:'Review prepared title and preview; external changes require authorization.'});
  }
  if(decision.action==='SCALE'&&!getOpportunity(p.opportunityId).parentId){
   const existing=list('business_opportunities').filter(o=>o.parentId===p.opportunityId);
   if(existing.length<config().maxVariantsPerProduct){const o=getOpportunity(p.opportunityId);importOpportunities([{...o,title:o.niche+' appointment landing-page starter',niche:o.niche+' appointments',parentId:o.id,reasoning:'Related variant proposed from '+p.id+' performance; reuses original components.'}],o.simulated?'demo':'sales-feedback');}
  }
  log(`NEO // ${p.mode} ${decision.action} · ${p.title}: ${decision.reason}`);return decision;
 }
 async function collect(job){
  const selected=mode(),provider=selected==='DEMO'?'demo-proven-format-fixtures':'live-public-web';
  try{
   charge({id:job.id+':research',kind:'research',amount:selected==='DEMO'?.01:0,basis:selected==='DEMO'?'simulated':'unpriced',detail:'Research adapter invocation',selected});
   let rows,checks=[],discovery=null;
   if(selected==='DEMO')rows=['Restaurant','Dental practice','Home maintenance'].map((niche,i)=>({title:niche==='Restaurant'?'Tablelight — Restaurant Website Kit':niche+' landing-page starter',niche,deliverable:niche==='Restaurant'?'restaurant-kit-v2':'landing-page',priceEvidence:[{url:'https://example.com/demo/price/'+i,title:niche+' comparable (simulated)',amount:30+i*5,currency:'EUR',license:'Single project',observedAt:stamp()}],observedDemand:86-i*2,competition:35,confidence:85,platformRisk:10,source:'demo',evidence:[1,2].map(j=>({url:`https://example.com/demo/${i}/${j}`,observation:'SIMULATED paid-format evidence for deterministic development. Not a real seller or real demand.'}))}));
   else if(options.researchProvider)rows=await options.researchProvider.collect({signal:job.controller.signal});
   else {const result=await discoverMarket(async url=>{
    const cache=db.prepare('SELECT * FROM source_cache WHERE url=?').get(url);if(cache&&cache.expires_at>Date.now())return cache.body;
    const r=await request(url,{signal:AbortSignal.any([job.controller.signal,AbortSignal.timeout(20000)])});if(!r.ok)throw Error('Market research HTTP '+r.status);const text=await r.text();if(text.length>3000000)throw Error('Research response too large');db.prepare('INSERT INTO source_cache VALUES(?,?,?,?) ON CONFLICT(url) DO UPDATE SET body=excluded.body,expires_at=excluded.expires_at,collected_at=excluded.collected_at').run(url,text,Date.now()+3600000,stamp());return text;
   },{signal:job.controller.signal,state:setting('market_discovery_'+selected,{}),save:s=>storeSetting('market_discovery_'+selected,s)});rows=result.opportunities;checks=result.checks;discovery=result.discovery;}
   ensureRunning();
   if(selected==='LIVE'&&rows.length){
    const comparators=new Map(setting('market_comparators_LIVE',[]).map(o=>[opportunityFingerprint(o),o]));
    for(const row of rows){const o=normalizeOpportunity(row,'LIVE','live-adapter');if(!o.websiteBrief)comparators.set(opportunityFingerprint(o),o);}
    storeSetting('market_comparators_LIVE',[...comparators.values()]);
   }
   const imported=rows.length?importOpportunities(rows,selected==='DEMO'?'demo':'live-adapter'):{created:0,duplicates:0};
   db.prepare('INSERT INTO business_sources VALUES(?,?,?,?)').run(randomUUID(),selected,JSON.stringify({provider,discovery,status:checks.some(c=>c.status==='FAILED')?(rows.length?'PARTIAL':'FAILED'):'COMPLETE',checks,...imported,simulated:selected==='DEMO'}),stamp());
   if(discovery){const saved=setting('market_discovery_'+selected,{});saved.outbox=[];storeSetting('market_discovery_'+selected,saved);}
   for(const c of checks.filter(c=>c.status==='FAILED'))log('Research Lab // '+c.id+': '+c.error,'warn');
   log(`Research Lab // ${selected}: ${imported.created} new opportunities; ${imported.duplicates} duplicates retained`);return imported;
  }catch(e){ensureRunning();if(e.message.includes('BUDGET LIMIT'))throw e;db.prepare('INSERT INTO business_sources VALUES(?,?,?,?)').run(randomUUID(),selected,JSON.stringify({provider,status:'FAILED',error:e.message,simulated:false}),stamp());log('Research Lab // live source unavailable; using saved/manual queue only. '+e.message,'warn');return {created:0,error:e.message};}
 }
 function evaluateQueue(){
  for(const o of list('business_opportunities').filter(o=>o.status==='DISCOVERED'||o.status==='APPROVED')){o.status='ANALYZING';saveOpportunity(o);const result=scoreOpportunity(o,config());Object.assign(o,result,{status:result.approved?'APPROVED':'REJECTED'});saveOpportunity(o);log(`NEO // ${o.mode} ${o.title}: ${result.reason}`);}
 }
 function capacity(){
  const c=config(),now=Date.now(),state=setting('business_capacity',{}),all=workers(),backlog=list('business_opportunities').filter(o=>o.status==='APPROVED').length,active=all.filter(w=>!w.deactivated);
  if(backlog>=c.minimumQueueBeforeScaling){state.backlogSince??=now;
   if(now-state.backlogSince>=c.scaleSustainMs&&now-(state.lastScale||0)>=c.scaleCooldown&&active.length<c.maxAgents&&(all.length<124||all.some(w=>w.dynamic&&w.deactivated&&w.home==='website'))&&active.filter(w=>w.home==='website').length<c.maxAgentsPerDepartment.website){
    const dormant=all.find(w=>w.dynamic&&w.deactivated&&w.home==='website'),id=dormant?.id||'BA-'+String(all.length+1).padStart(2,'0');
    const w=dormant||{id,name:'Website builder '+id,role:'WEBSITE BUILDER',home:'website',destination:'neo',current_room:'neo',route:[HUB],x:HUB.x,y:HUB.y,speed:80,station_index:all.length,started_at:now,jobsCompleted:0,failures:0,averageCost:0,averageCompletionTime:0,qualityAverage:0};
    saveWorker({...w,dynamic:true,deactivated:false,state:'IDLE',active_task:null,capabilities:['website-template'],queue:[],idleSince:now,task_description:'Deployed for approved website backlog'});state.lastScale=now;
    log(`NEO // CAPACITY: ${backlog} approved website jobs; deployed ${id}. Template worker; production lanes ${c.maxConcurrentJobs}.`);
   }
  }else{state.backlogSince=null;for(const w of active.filter(w=>w.dynamic&&!w.active_task)){if(!w.idleSince)saveWorker({...w,idleSince:now});else if(now-w.idleSince>=c.idleScaleDownMs&&now-(state.lastScale||0)>=c.scaleCooldown){saveWorker({...w,state:'OFFLINE',deactivated:true,task_description:'Surplus capacity deactivated',route:[positionAt(w)],started_at:now});state.lastScale=now;log('NEO // CAPACITY: deactivated idle '+w.id);break;}}}
  storeSetting('business_capacity',state);
 }
 async function stage(job,stageName,room,capability,message,product){
  ensureRunning();capacity();
  release(job.id,product?.qualityScore||0);
  let candidates=[];
  while(!candidates.length){ensureRunning();if(job.controller.signal.aborted)throw fault(409,'Job paused');
  candidates=workers().filter(w=>!w.deactivated&&caps(w).includes(capability)&&(!w.active_task||w.inspection||w.active_task===job.id));
  if(!candidates.length){db.prepare('UPDATE jobs SET stage=?,message=? WHERE id=?').run('waiting', 'Waiting for '+capability,job.id);await delay(options.fastBusiness?2:150,null,{signal:job.controller.signal});}
  }
  jobStage(job,stageName,message,0);
  candidates.sort((a,b)=>(a.jobsCompleted||0)-(b.jobsCompleted||0)||a.id.localeCompare(b.id));const w=candidates[0];
  if(!w)throw fault(409,'No capable worker available for '+capability);
  const next=visitStation({...w,inspection:null,queue:[],idleSince:null},room,w.station_index,'WORKING',job.id);next.task_description=message;next.queue=[product?.id||job.id];saveWorker(next);
  if(product){product.workerAgent=w.id;product.currentCapability=capability;product.assignments=[...(product.assignments||[]),{workerAgent:w.id,capability,department:room,startedAt:stamp()}];saveProduct(product);}
  // Arrival is part of the task lifecycle, so the worker reaches its actual station before completing work.
  if(!options.fastBusiness)while(positionAt(workers().find(a=>a.id===w.id)).moving){ensureRunning();await delay(150,null,{signal:job.controller.signal});}
  await delay(options.stageDelayMs??(options.fastBusiness?1:1200),null,{signal:job.controller.signal});ensureRunning();return w.id;
 }
 function release(jobId,quality=0,cost=0,elapsed=0,failed=false){
  for(const w of workers().filter(w=>w.active_task===jobId)){const n=(w.jobsCompleted||0)+1;saveWorker({...w,state:w.state==='STOPPED'?'STOPPED':'IDLE',resume_state:'IDLE',active_task:null,queue:[],inspection:null,station_due:null,idleSince:Date.now(),jobsCompleted:failed?w.jobsCompleted:n,failures:(w.failures||0)+(failed?1:0),averageCost:failed?w.averageCost:((w.averageCost||0)*(n-1)+cost)/n,averageCompletionTime:failed?w.averageCompletionTime:((w.averageCompletionTime||0)*(n-1)+elapsed)/n,qualityAverage:failed?w.qualityAverage:((w.qualityAverage||0)*(n-1)+quality)/n,task_description:failed?'Task interrupted · awaiting manager':'Completed real business task'});}
 }
 async function runSingle(job,researchOnly=false,skipResearch=false){
  const start=Date.now();let p,completed=false;try{
   if(!skipResearch){await stage(job,'research','research','research',`Research Lab // ${mode()} opportunity queue`);
   await collect(job);await stage(job,'validation','research','research','NEO // deterministic opportunity scoring');evaluateQueue();}if(researchOnly){completed=true;return 0;}
   let o=job.checkpoint.businessOpportunity?getOpportunity(job.checkpoint.businessOpportunity):list('business_opportunities').filter(o=>o.status==='APPROVED').sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))[0];
   if(!o){for(const saved of productRows().filter(p=>['LISTED','SELLING','PAUSED'].includes(p.status)))analyze(saved.id);completed=true;return 0;}
   job.checkpoint.businessOpportunity=o.id;db.prepare('UPDATE jobs SET checkpoint=? WHERE id=?').run(JSON.stringify(job.checkpoint),job.id);
   p=getProduct('BP-'+o.fingerprint+'-'+o.mode)||{id:'BP-'+o.fingerprint+'-'+o.mode,opportunityId:o.id,mode:o.mode,title:o.title,niche:o.niche,deliverable:o.deliverable,websiteBrief:o.websiteBrief||null,priceCents:o.pricing.priceCents,pricing:o.pricing,productType:'website',creationStrategy:o.websiteBrief?'local-ai-brief-with-safe-renderer':'deterministic-template',provider:creationProviders.find(p=>p.available&&p.capabilities.includes('website')).id,requiredTools:['Node','internal templates'],estimatedCost:o.estimatedProductionCost,actualCost:0,status:'QUEUED',files:[],qualityScore:0,iterations:0,listingStatus:'NONE',createdAt:stamp(),reusePercentage:0};saveProduct(p);
   if(['LISTED','SELLING','KILLED','PAUSED'].includes(p.status)){completed=true;return 0;}
   o.status='PRODUCING';saveOpportunity(o);
   if(p.status!=='READY'){
    let artifact,qa;const c=config();
    for(let attempt=p.iterations;attempt<=c.maxRevisions;attempt++){
     p.status='PRODUCING';saveProduct(p);await stage(job,'building','website','website-template',`Website Creator // ${p.title} · template reuse`,p);
     const amount=o.mode==='DEMO'?.08:euro(c.localCostPerMinute);charge({id:p.id+':build:'+attempt,kind:attempt?'revision':'production',amount,productId:p.id,basis:o.mode==='DEMO'?'simulated':c.localCostPerMinute?'estimated':'unpriced',detail:'Deterministic website build; local runtime rate, no paid AI'});
     artifact=(options.websiteBuilder||buildWebsite)(o,attempt);p.files=Object.keys(artifact.files);p.reusePercentage=artifact.reusePercentage;p.creationCostSaved=artifact.creationCostSaved;p.timeSaved=artifact.timeSaved;p.reuseNote=artifact.measurementNote;p.status='QA';saveProduct(p,artifact);
     await stage(job,'quality','quality','html-qa',`Quality Control // ${p.title} · revision ${attempt}`,p);
     qa=websiteQA(artifact,o,c.minQualityScore);p.iterations=attempt+1;p.qualityScore=qa.qualityScore;
     db.prepare('INSERT OR REPLACE INTO business_qa VALUES(?,?,?,?)').run(p.id+':'+attempt,p.id,JSON.stringify({...qa,attempt}),stamp());
     if(qa.passed){p.status='READY';saveProduct(p,artifact);break;}
     p.status='REWORK';saveProduct(p);log(`NEO // QA rejected ${p.title}; ${qa.qualityScore}/100; bounded revision ${attempt+1}/${c.maxRevisions}`,'warn');
    }
    if(!qa?.passed){p.status='QA_FAILED';saveProduct(p);o.status='PAUSED';saveOpportunity(o);throw fault(422,'QA failed: revision limit reached; nothing listed');}
    for(const item of db.prepare('SELECT * FROM business_library').all()){const v=parse(item);v.uses++;db.prepare('UPDATE business_library SET data=? WHERE id=?').run(JSON.stringify(v),item.id);}
   }
   o.status='READY';saveOpportunity(o);await stage(job,'publishing','product','listing-package',`Marketplace Relay // ${o.mode} listing package`,p);
   const adapter=new MarketplaceAdapter(o.mode),prepared=adapter.prepareListing(p),validation=adapter.validateListing(prepared);if(!validation.passed)throw fault(422,validation.reason);
   const listing={...adapter.publishListing(prepared),id:'BL-'+p.id,mode:o.mode,createdAt:stamp()};saveListing(listing);p.pageCreatedAt=stamp();p.pagePath='/product?id='+encodeURIComponent(p.id)+'&mode='+p.mode;p.listingStatus=listing.status;p.status=o.mode==='DEMO'?'LISTED':'READY';p.actualCost=metrics(p.id).cost;saveProduct(p);o.status=p.status;saveOpportunity(o);
   if(o.mode==='DEMO'){
    jobStage(job,'feedback','DEMO marketplace // simulated traffic and orders; no real money',100);
    recordMetrics(p.id,{id:'initial-'+p.id,views:150,clicks:18,orders:3,messages:0,fees:3,note:'DEMO fixture: 150 views, 18 clicks, 3 orders at the saved product price. No real customers or money.'},'demo');
    analyze(p.id);
   }else log('NEO // MANUAL_ACTION_REQUIRED: '+p.title+' listing prepared. No external publication claimed.');
   completed=true;return 1;
  }catch(e){if(p&&!job.controller.signal.aborted&&!['READY','SELLING','LISTED'].includes(p.status)){p.status=p.status==='QA_FAILED'?'QA_FAILED':'FAILED';saveProduct(p);const interrupted=getOpportunity(p.opportunityId);interrupted.status='PAUSED';saveOpportunity(interrupted);}if(p&&e.message.includes('BUDGET LIMIT')){p.status='BUDGET_PAUSED';saveProduct(p);const o=getOpportunity(p.opportunityId);o.status='PAUSED';saveOpportunity(o);log(e.message,'warn');}throw e;}
  finally{release(job.id,p?.qualityScore||0,p?metrics(p.id).cost:0,Date.now()-start,!completed);capacity();}
 }
 const scheduleKey=()=> 'business_schedule_'+mode();
 const researchDue=()=>Date.now()>=(setting(scheduleKey(),{}).nextResearchAt||0);
 const planningEnabled=()=>mode()==='LIVE'&&!!config().continuousProduction&&!!options.planWebsite;
 const planKey=()=> 'business_planner_'+mode();
 const planningDue=()=>planningEnabled()&&Date.now()>=(setting(planKey(),{}).nextAt||0);
 async function refill(job){
  if(!planningDue())return;
  const target=config().maxConcurrentJobs,queue=list('business_opportunities').filter(o=>['DISCOVERED','APPROVED'].includes(o.status));if(queue.length>=target)return;
  const saved=setting(planKey(),{sequence:0}),briefs=list('business_opportunities').map(o=>o.websiteBrief).filter(Boolean);
  saved.nextAt=Date.now()+(options.planningIntervalMs??60000);saved.state='PLANNING';saved.error=null;storeSetting(planKey(),saved);
  // Reuse still-valid observed prices, not fabricated research for a new audience.
  const sources=[...list('business_opportunities').filter(o=>!o.websiteBrief&&o.source==='live-adapter'),...setting('market_comparators_LIVE',[])];
  const seeds=[...new Map(sources.map(o=>[opportunityFingerprint(o),o])).values()].filter(o=>scoreOpportunity(o,config()).approved);
  if(!seeds.length){storeSetting(planKey(),{...saved,state:'WAITING_FOR_PRICE_EVIDENCE',error:'No fresh approved market comparators available'});return;}
  let created=0;
  for(let i=queue.length;i<target;i++){
   let rejectedBrief;
   ensureRunning();const seed=seeds[(saved.sequence||0)%seeds.length];saved.sequence=(saved.sequence||0)+1;storeSetting(planKey(),saved);
   try{
    await stage(job,'planning','research','research',`NEO // designing original product ${saved.sequence} · ${created}/${target-queue.length} prepared`);
    spendAllowed(0,{kind:'ai'});
    const brief=validateBrief(await options.planWebsite(plannerPrompt(seed,briefs,saved.sequence,saved.rejections||[]),job.controller.signal));rejectedBrief=brief;
    ensureRunning();job.controller.signal.throwIfAborted();assertDistinctBrief(brief,briefs);
    const candidate={...seed,title:brief.brand+' — '+brief.audience+' Website Kit',niche:brief.audience+' / '+brief.purpose,deliverable:'generated-website-v1',websiteBrief:brief,parentId:null,confidence:60,reasoning:'NEO-designed product hypothesis within an observed paid market. Specific audience demand remains unvalidated. '+brief.purpose,evidence:seed.evidence.map(e=>({...e,observation:e.observation+' Broader comparator only; not evidence of sales for this new kit.'}))};
    if(candidate.niche.length>160)throw Error('Audience and purpose too long');
    const result=importOpportunities([candidate],'neo-market-hypothesis');if(!result.created)throw Error('Duplicate product identity');briefs.push(brief);created+=result.created;
    log('NEO // original brief queued: '+candidate.title);
   }catch(e){if(job.controller.signal.aborted)throw e;saved.error=e.message;saved.rejections=[...(saved.rejections||[]),{audience:rejectedBrief?.audience||'',purpose:rejectedBrief?.purpose||'',reason:e.message}].slice(-12);storeSetting(planKey(),saved);log('NEO // product planning rejected: '+e.message,'warn');}
  }
  saved.emptyRefills=created?0:(saved.emptyRefills||0)+1;
  const backoff=options.planningIntervalMs??Math.min(600000,60000*2**Math.min(4,saved.emptyRefills));
  storeSetting(planKey(),{...saved,state:created?'QUEUED':'RETRY_PENDING',created,lastRunAt:stamp(),nextAt:Date.now()+backoff});
 }
 function productionStatus(){
  const c=config(),jobs=db.prepare("SELECT id,stage,message,checkpoint FROM jobs WHERE kind='business-item' AND state='running'").all().map(j=>({id:j.id,stage:j.stage,message:j.message,opportunityId:JSON.parse(j.checkpoint).businessOpportunity}));
  const queued=list('business_opportunities').filter(o=>['DISCOVERED','APPROVED'].includes(o.status)).length;
  const schedule=setting(scheduleKey(),{});let budgetBlocked=false;try{spendAllowed(0);}catch{budgetBlocked=true;}
  const planner=setting(planKey(),{}),planning=!!db.prepare("SELECT id FROM jobs WHERE kind LIKE 'business%' AND state='running' AND stage='planning'").get();
  return {enabled:!!c.continuousProduction,maxConcurrentJobs:c.maxConcurrentJobs,active:jobs.length,queued,jobs,planner:{...planner,enabled:planningEnabled()},nextResearchAt:schedule.nextResearchAt||null,state:setting('running',1)===0?'PAUSED':budgetBlocked?'BUDGET_LIMIT':planning?'DESIGNING_PRODUCTS':jobs.length?'PRODUCING':queued?'QUEUED':planningEnabled()?'WAITING_FOR_PRODUCT_PLANNER':researchDue()?'RESEARCH_DUE':'WAITING_FOR_RESEARCH'};
 }
 function needsRun(){const s=productionStatus();return s.enabled&&s.state!=='BUDGET_LIMIT'&&(s.queued>0||researchDue()||planningDue());}
 async function run(job,researchOnly=false){
  // Preserve single-cycle behavior and old checkpoints when continuous mode is off.
  if((!config().continuousProduction&&config().maxConcurrentJobs===1)||job.checkpoint.businessOpportunity)return runSingle(job,researchOnly);
  let made=0;
  try{
   spendAllowed(0);
   if(researchOnly||researchDue()){
    // Persist the cooldown before I/O so failures/restarts cannot hammer a source.
    storeSetting(scheduleKey(),{nextResearchAt:Date.now()+config().researchIntervalMs});
    await stage(job,'research','research','research',`Research Lab // ${mode()} continuous queue`);
    await collect(job);
   }
   if(!researchOnly)await refill(job);
   evaluateQueue();release(job.id);
   if(researchOnly)return 0;
   jobStage(job,'production','Continuous production lanes active',0);
   const saved=db.prepare("SELECT * FROM jobs WHERE kind='business-item' AND state='paused' AND json_extract(checkpoint,'$.parentJob')=? ORDER BY created_at,id").all(job.id);
   const lane=async()=>{
    while(!job.controller.signal.aborted){
     ensureRunning();spendAllowed(0);
     const previous=saved.shift();
     const o=previous?getOpportunity(JSON.parse(previous.checkpoint).businessOpportunity):list('business_opportunities').filter(o=>o.status==='APPROVED').sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))[0];
     if(!o)return;
     // No await between selection, claim and checkpoint: another lane cannot claim it.
     o.status='PRODUCING';saveOpportunity(o);
     const item={id:previous?.id||randomUUID(),kind:'business-item',controller:job.controller,checkpoint:{businessOpportunity:o.id,parentJob:job.id}};
     if(previous)db.prepare("UPDATE jobs SET state='running',finished_at=NULL,message='Resuming production lane' WHERE id=?").run(item.id);
     else db.prepare("INSERT INTO jobs(id,kind,state,stage,message,created_at,checkpoint) VALUES(?,?,'running','queued',?,?,?)").run(item.id,item.kind,o.title,stamp(),JSON.stringify(item.checkpoint));
     try{
      const completedCount=await runSingle(item,false,true);made+=completedCount;
      db.prepare("UPDATE jobs SET state='completed',stage='done',message='Product package complete',finished_at=? WHERE id=?").run(stamp(),item.id);
     }catch(e){
      const paused=job.controller.signal.aborted;
      db.prepare('UPDATE jobs SET state=?,message=?,finished_at=? WHERE id=?').run(paused?'paused':'failed',e.message,stamp(),item.id);
      if(paused)throw e;
      log('Production lane // '+o.title+': '+e.message,'error');
      if(e.message.includes('BUDGET LIMIT'))throw e;
     }
    }
   };
   // Wait for every lane before STOP closes the database or resumes the parent.
   const results=await Promise.allSettled(Array.from({length:config().maxConcurrentJobs},()=>lane()));
   const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
   if(job.controller.signal.aborted)throw fault(409,'Production paused');
   for(const p of productRows().filter(p=>['LISTED','SELLING','PAUSED'].includes(p.status)))analyze(p.id);
   return made;
  }finally{release(job.id);}
 }
 function overview(){const selected=mode(),opportunities=list('business_opportunities'),products=productRows().map(p=>({...p,metrics:metrics(p.id)})),listings=list('business_listings'),allWorkers=workers();return {mode:selected,config:config(),production:productionStatus(),summary:{...financial(),today:financial(selected,stamp().slice(0,10)),month:financial(selected,stamp().slice(0,7)),activeProducts:products.filter(p=>!['KILLED','PAUSED','QA_FAILED'].includes(p.status)).length,listings:listings.filter(l=>l.status==='LISTED').length,orders:products.reduce((s,p)=>s+p.metrics.orders,0),views:products.reduce((s,p)=>s+p.metrics.views,0),clicks:products.reduce((s,p)=>s+p.metrics.clicks,0),opportunities:opportunities.length,queued:opportunities.filter(o=>o.status==='APPROVED').length,activeAgents:allWorkers.filter(w=>!w.deactivated).length,load:allWorkers.filter(w=>w.state==='WORKING').length},opportunities,products,listings,orders:list('business_orders').slice(0,100),decisions:list('business_decisions').slice(0,30),sources:list('business_sources').slice(0,10),library:db.prepare('SELECT * FROM business_library').all().map(r=>({kind:r.kind,...parse(r)})),providers:creationProviders,agents:allWorkers.map(w=>({agentId:w.id,name:w.name,role:w.role,department:w.home,status:w.state,capabilities:caps(w),currentTask:w.active_task,queue:w.queue,jobsCompleted:w.jobsCompleted,failures:w.failures,averageCost:w.averageCost,averageCompletionTime:w.averageCompletionTime,qualityAverage:w.qualityAverage,dynamic:!!w.dynamic,deactivated:!!w.deactivated}))};}
 function artifact(id,selected=mode()){if(!['LIVE','DEMO'].includes(selected))throw fault(400,'Invalid product mode');const row=db.prepare('SELECT * FROM business_products WHERE id=? AND mode=?').get(id,selected);if(!row?.package)throw fault(404,'No generated package for this product');return row;}
 function listingPackage(id,selected=mode()){
  if(typeof id!=='string'||!id)throw fault(400,'Supply a product ID');
  const row=artifact(id,selected),product=parse(row),listing=parse(db.prepare('SELECT data FROM business_listings WHERE product_id=? AND mode=?').get(id,selected));
  const qa=db.prepare('SELECT data FROM business_qa WHERE product_id=? ORDER BY rowid DESC LIMIT 1').get(id);
  if(!listing||!qa||!parse(qa).passed)throw fault(409,'A QA-passed prepared listing is required');
  return {schemaVersion:1,mode:selected,simulated:selected==='DEMO',listing:{...listing,files:product.files},pricing:product.pricing||null,package:{filename:id+'.zip',sha256:createHash('sha256').update(row.package).digest('hex'),files:product.files,downloadPath:'/api/business/package?id='+encodeURIComponent(id)+'&mode='+selected},qa:parse(qa),publication:{verification:listing.verification||'NOT_VERIFIED',externalUrl:listing.externalUrl||null},instructions:'Publish the ZIP and listing artwork through your own marketplace account. Check its requirements and review the copy first. This export does not publish anything or verify external sales.'};
 }
 function recordPublication(body){
  if(mode()!=='LIVE')throw fault(409,'Manual publication records are only available in LIVE mode');
  const bundle=listingPackage(body.productId),p=getProduct(body.productId),l=bundle.listing;
  if(body.confirmed!==true)throw fault(400,'Confirm that you have already published this package');
  let url;try{url=new URL(body.url);if(url.protocol!=='https:'||url.username||url.password||body.url.length>2048)throw Error();}catch{throw fault(400,'Supply the public HTTPS listing URL without credentials');}
  if(l.externalUrl){if(l.externalUrl!==url.href)throw fault(409,'This product already has a different publication record');return l;}
  if(p.status!=='READY'||l.status!=='MANUAL_ACTION_REQUIRED')throw fault(409,'Only a ready package awaiting publication can be recorded');
  const published={...l,status:'LISTED',externalUrl:url.href,verification:'OPERATOR_REPORTED_UNVERIFIED',reportedAt:stamp(),actionRequired:'Publication reported by operator; remote availability and orders are not verified.'};
  db.exec('BEGIN');try{saveListing(published);p.status='LISTED';p.listingStatus='LISTED';saveProduct(p);const o=getOpportunity(p.opportunityId);o.status='LISTED';saveOpportunity(o);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  log('Marketplace Relay // manual publication recorded for '+p.title+' · unverified');return published;
 }
 function detailsPage(id,selected=mode()){const b=listingPackage(id,selected),p=getProduct(id);return productPage(p,getOpportunity(p.opportunityId),b.listing,b.qa);}
 function catalog({mode:selected='LIVE',query='',sort='newest'}={}){
  if(!['LIVE','DEMO'].includes(selected))throw fault(400,'Invalid catalog mode');
  if(typeof query!=='string'||query.length>120)throw fault(400,'Search must be 120 characters or fewer');
  if(!['newest','price-asc','price-desc','name'].includes(sort))throw fault(400,'Invalid catalog sort');
  const products=db.prepare(`SELECT p.data,l.data listing,o.data opportunity,
   (SELECT q.data FROM business_qa q WHERE q.product_id=p.id ORDER BY q.rowid DESC LIMIT 1) qa
   FROM business_products p JOIN business_listings l ON l.product_id=p.id AND l.mode=p.mode
   JOIN business_opportunities o ON o.id=p.opportunity_id AND o.mode=p.mode
   WHERE p.mode=? AND p.package IS NOT NULL`).all(selected).flatMap(row=>{
    const p=parse(row),l=JSON.parse(row.listing),o=JSON.parse(row.opportunity),qa=row.qa&&JSON.parse(row.qa);
    if(!['READY','LISTED','SELLING'].includes(p.status)||!qa?.passed)return [];
    const q='id='+encodeURIComponent(p.id)+'&mode='+selected;
    return [{id:p.id,title:p.title,niche:o.niche,description:String(l.description||'Editable website kit.').slice(0,600),priceCents:productPriceCents(p),discount:p.pricing?.discount??null,files:p.files.length,createdAt:p.createdAt,externalUrl:l.externalUrl||null,pagePath:'/product?'+q,previewPath:'/api/business/package?'+q+'&view=1',artPath:'/api/business/file?'+q+'&name=listing.svg'}];
   });
  const term=query.trim().toLocaleLowerCase('en'),filtered=products.filter(p=>!term||(p.title+' '+p.niche).toLocaleLowerCase('en').includes(term));
  filtered.sort((a,b)=>(sort==='price-asc'?a.priceCents-b.priceCents:sort==='price-desc'?b.priceCents-a.priceCents:sort==='name'?a.title.localeCompare(b.title):String(b.createdAt).localeCompare(String(a.createdAt)))||a.id.localeCompare(b.id));
  return {mode:selected,query:query.trim(),sort,total:products.length,products:filtered};
 }
 return {config,configure,mode,overview,run,needsRun,productionStatus,importOpportunities,metrics,recordMetrics,recordCost,analyze,ledger,charge,spendAllowed,capacity,artifact,listingPackage,recordPublication,detailsPage,catalog};
}
