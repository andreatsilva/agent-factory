import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createFactory} from '../server.mjs';
import {upstream} from './providers.mjs';
import {normalizeOpportunity,scoreOpportunity,performanceDecision,DEFAULT_BUSINESS_CONFIG as defaults} from '../business-rules.mjs';
import {buildWebsite} from '../website-line.mjs';
import {inspectZip} from '../zip.mjs';
const example={title:'Independent restaurant website starter',niche:'Restaurant',observedDemand:90,competition:25,confidence:85,platformRisk:10,priceEvidence:[{url:'https://example.com/market/1',title:'Comparable fixture',amount:25,currency:'EUR',license:'Single project',observedAt:new Date().toISOString()}],evidence:[1,2].map(n=>({url:'https://example.com/market/'+n,observation:'Test fixture, paid-format listing'}))};
async function fixture(options={}){
 const dir=mkdtempSync(join(tmpdir(),'neo-business-')),remote=upstream();let app,base;
 const start=async()=>{app=createFactory({dataDir:dir,fetch:remote.fetch,env:{FACTORY_INTERVAL_SECONDS:'999999'},business:{fastBusiness:true,...options}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;};await start();
 const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:r.headers.get('content-type').includes('application/json')?await r.json():Buffer.from(await r.arrayBuffer())};};
 const cycle=async()=>{assert.equal((await api('/api/business/cycle',{})).status,202);for(let i=0;i<400;i++){const j=(await api('/api/jobs')).data.jobs[0];if(j.state!=='running')return j;await new Promise(r=>setTimeout(r,5));}throw Error('Cycle timeout');};
 return {remote,get app(){return app;},api,cycle,async restart(){await app.close();await start();},async close(){await app.close();rmSync(dir,{recursive:true,force:true});}};
}
test('opportunity scoring is deterministic, evidence gated and risk penalized',()=>{
 const good=normalizeOpportunity(example,'LIVE'),s=scoreOpportunity(good);assert.deepEqual(s,scoreOpportunity(good));assert.equal(s.approved,true);
 for(const bad of [{...good,evidence:[]},{...good,confidence:10},{...good,legalRisk:80},{...good,platformRisk:90},{...good,competition:99,observedDemand:20},{...good,estimatedProductionCost:19}])assert.equal(scoreOpportunity(bad).approved,false);
 assert.throws(()=>normalizeOpportunity({...example,simulated:true},'LIVE'));
});
test('three full DEMO cycles produce QA-passed ZIPs, orders, reuse, profit decisions and persistent isolated state',async()=>{
 const f=await fixture();try{
  await f.api('/api/business/config',{mode:'DEMO',maxVariantsPerProduct:0});
  for(let i=0;i<3;i++)assert.equal((await f.cycle()).state,'completed');
  let d=(await f.api('/api/business')).data;assert.equal(d.products.length,3);assert.equal(d.summary.orders,9);assert.equal(d.orders.length,9);assert.ok(d.orders.every(o=>o.simulated&&o.unitPrice===d.products.find(p=>p.id===o.productId).priceCents/100));assert.equal(d.summary.revenue,283.5);assert.equal(d.summary.netProfit,274.23);assert.equal(d.summary.cost,9.27);
  assert.ok(d.products.every(p=>p.status==='SELLING'&&p.qualityScore===100&&p.workerAgent&&p.reusePercentage===85));assert.ok(d.decisions.every(d=>d.action==='SCALE'));assert.ok(d.library.every(l=>l.uses===3));
  for(const p of d.products){const artifact=await f.api('/api/business/package?id='+p.id);assert.equal(inspectZip(artifact.data).length,p.deliverable==='restaurant-kit-v2'?8:5);const page=await f.api(p.pagePath);assert.equal(page.status,200);assert.ok(page.data.toString().includes('€'+(p.priceCents/100).toFixed(2)));assert.match(page.data.toString(),/CREATED PAGE/);const listing=await f.api('/api/business/listing-package?id='+p.id);assert.equal(listing.data.listing.price,p.priceCents/100);if(p.deliverable==='restaurant-kit-v2'){assert.equal((await f.api('/api/business/file?id='+p.id+'&name=menu.html')).status,200);assert.equal((await f.api('/api/business/file?id='+p.id+'&name=listing.svg')).status,200);assert.equal((await f.api('/api/business/file?id='+p.id+'&name=../../server.mjs')).status,404);}}
  const report={id:'extra-window',views:10,clicks:2,orders:1};await f.api('/api/business/metrics',{productId:d.products[0].id,report});await f.api('/api/business/metrics',{productId:d.products[0].id,report});assert.equal((await f.api('/api/business')).data.summary.orders,10);
  assert.equal((await f.api('/api/business/metrics',{productId:d.products[1].id,report})).status,409);
  await f.restart();d=(await f.api('/api/business')).data;assert.equal(d.mode,'DEMO');assert.equal(d.products.length,3);assert.equal(d.summary.orders,10);assert.deepEqual(d.products.map(p=>p.priceCents).sort(),[2700,3150,3600]);
  await f.cycle();assert.equal((await f.api('/api/business')).data.products.length,3);
  await f.api('/api/business/config',{mode:'LIVE'});d=(await f.api('/api/business')).data;assert.equal(d.products.length,0);assert.equal(d.summary.revenue,0);assert.equal((await f.api('/api/dashboard')).data.sales,0);
 }finally{await f.close();}
});
test('manual import validates and deduplicates before deterministic approval; LIVE listing requires manual action',async()=>{
 const f=await fixture({researchProvider:{async collect(){return [];}}});try{
  const a=await f.api('/api/business/import',{opportunities:[example,example]});assert.equal(a.data.created,1);assert.equal(a.data.duplicates,1);
  assert.equal((await f.api('/api/business/import',{opportunities:[{...example,niche:'  RESTAURANT  '}]})).data.duplicates,1);
  assert.equal((await f.api('/api/business/import',{opportunities:[{...example,observedDemand:'90'}]})).status,400);
  assert.equal((await f.cycle()).state,'completed');const d=(await f.api('/api/business')).data;assert.equal(d.products.length,1);assert.equal(d.listings[0].status,'MANUAL_ACTION_REQUIRED');assert.equal(d.summary.revenue,0);assert.equal(d.summary.costCoverage,false);
  assert.equal((await f.api('/api/business/metrics',{productId:d.products[0].id,source:'demo',report:{id:'no-fake-orders',views:10,clicks:2,orders:1}})).status,409);
 }finally{await f.close();}
});
test('catalog isolates modes, exposes only ready QA-passed products and supports safe search and price sorting',async()=>{
 const f=await fixture();try{
  assert.equal((await f.api('/api/business/catalog')).data.products.length,0);
  assert.match((await f.api('/catalog')).data.toString(),/The shelves are waiting/);
  await f.api('/api/business/config',{mode:'DEMO',maxVariantsPerProduct:0});
  for(let i=0;i<3;i++)await f.cycle();
  assert.equal((await f.api('/api/business/catalog')).data.products.length,0,'LIVE is the default even when factory runs DEMO');
  assert.equal((await f.api('/api/public/products')).data.products.length,0,'Public products never expose demo output');
  const ascending=(await f.api('/api/business/catalog?mode=DEMO&sort=price-asc')).data;
  assert.deepEqual(ascending.products.map(p=>p.priceCents),[2700,3150,3600]);
  assert.deepEqual((await f.api('/api/business/catalog?mode=DEMO&sort=price-desc')).data.products.map(p=>p.priceCents),[3600,3150,2700]);
  for(const p of ascending.products){assert.match(p.pagePath,/mode=DEMO/);assert.equal((await f.api(p.pagePath)).status,200);assert.equal((await f.api(p.artPath)).status,200);assert.equal((await f.api(p.previewPath)).status,200);assert.equal(p.metrics,undefined);}
  const term=encodeURIComponent(ascending.products[0].title.toUpperCase());
  assert.equal((await f.api('/api/business/catalog?mode=DEMO&q='+term)).data.products.length,1);
  const xss=encodeURIComponent('<script>alert("x")</script>');
  const html=(await f.api('/catalog?mode=DEMO&q='+xss)).data.toString();assert.match(html,/No matching products/);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);
  assert.match((await f.api('/catalog?mode=DEMO')).data.toString(),/These products and their market evidence are simulated/);
  assert.equal(f.app.business.mode(),'DEMO','Browsing catalogs must not change operating mode');
  for(const query of ['mode=OTHER','sort=invalid','q='+('a'.repeat(121))])assert.equal((await f.api('/catalog?'+query)).status,400);
  const [paused,failedQA,noPackage]=ascending.products;
  const row=f.app.db.prepare('SELECT data FROM business_products WHERE id=?').get(paused.id);const p=JSON.parse(row.data);p.status='PAUSED';f.app.db.prepare('UPDATE business_products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);
  f.app.db.prepare("UPDATE business_qa SET data=json_set(data,'$.passed',json('false')) WHERE product_id=?").run(failedQA.id);
  f.app.db.prepare('UPDATE business_products SET package=NULL WHERE id=?').run(noPackage.id);
  assert.equal((await f.api('/api/business/catalog?mode=DEMO')).data.products.length,0);
  await f.restart();assert.equal((await f.api('/api/business/catalog?mode=DEMO')).data.products.length,0);
 }finally{await f.close();}
});
test('LIVE listing handoff exports the QA package and records manual publication without claiming remote verification',async()=>{
 const f=await fixture({researchProvider:{async collect(){return [];}}});try{
  await f.api('/api/business/import',{opportunities:[example]});await f.cycle();const p=f.app.business.overview().products[0];
  const publicCatalog=await f.api('/api/public/products');assert.equal(publicCatalog.status,200);assert.equal(publicCatalog.data.products.length,1);assert.equal(publicCatalog.data.products[0].id,p.id);assert.equal(publicCatalog.data.products[0].priceCents,0);assert.equal(publicCatalog.data.products[0].pricingStatus,'FREE');const download=await f.api('/api/public/download/'+p.id);assert.equal(download.status,200);assert.deepEqual(download.data,Buffer.from(f.app.business.artifact(p.id,'LIVE').package));assert.ok(p.priceCents>0);assert.ok(publicCatalog.data.products[0].features.length);assert.ok(!JSON.stringify(publicCatalog.data).includes('/api/business/'));assert.ok(!Object.hasOwn(publicCatalog.data.products[0],'package'));
  const bundle=await f.api('/api/business/listing-package?id='+p.id);assert.equal(bundle.status,200);assert.equal(bundle.data.qa.passed,true);assert.equal(bundle.data.simulated,false);assert.equal(bundle.data.package.files.length,5);assert.match(bundle.data.package.sha256,/^[a-f0-9]{64}$/);assert.equal(bundle.data.publication.verification,'NOT_VERIFIED');
  assert.equal((await f.api('/api/business/publication',{})).status,400);
  const body={productId:p.id,url:'https://example.com/listing/restaurant',confirmed:true};
  assert.equal((await f.api('/api/business/publication',{...body,confirmed:false})).status,400);
  for(const url of ['javascript:alert(1)','http://example.com/item','https://user:secret@example.com/item'])assert.equal((await f.api('/api/business/publication',{...body,url})).status,400);
  const beforeCalls=f.remote.calls.length;const recorded=await f.api('/api/business/publication',body);assert.equal(recorded.status,200);assert.equal(recorded.data.verification,'OPERATOR_REPORTED_UNVERIFIED');assert.equal(f.remote.calls.length,beforeCalls);assert.equal(f.app.business.overview().products[0].status,'LISTED');assert.equal(f.app.business.overview().summary.revenue,0);
  assert.deepEqual((await f.api('/api/business/publication',body)).data,recorded.data);assert.equal((await f.api('/api/business/publication',{...body,url:'https://example.com/another'})).status,409);
  assert.equal((await f.api('/api/business/metrics',{productId:p.id})).status,400);
  assert.equal((await f.api('/api/business/metrics',{productId:p.id,source:'demo',report:{id:'wrong-source',views:10,clicks:2,orders:1}})).status,409);
  const report=await f.api('/api/business/metrics',{productId:p.id,report:{id:'manual-window',views:100,clicks:10,orders:2,refunds:20,fees:1}});assert.equal(report.status,200);assert.equal(report.data.metrics.netProfit,24);assert.equal(f.app.business.overview().orders.length,0);assert.equal(f.app.business.overview().summary.refunds,20);
  await f.restart();assert.equal(f.app.business.overview().listings[0].externalUrl,body.url);assert.equal(f.app.business.overview().products[0].status,'SELLING');
  await f.api('/api/business/config',{mode:'DEMO'});assert.equal((await f.api('/api/business/listing-package?id='+p.id)).status,404);assert.equal((await f.api('/api/business/publication',body)).status,409);
 }finally{await f.close();}
});

test('budget governor blocks optional production and accounts for per-product, research, revision and AI limits',async()=>{
 const f=await fixture();try{
  const b=f.app.business;b.configure({mode:'DEMO',dailyBudget:0});assert.throws(()=>b.spendAllowed(0));assert.equal((await f.cycle()).state,'failed');assert.equal(b.overview().products.length,0);
  b.configure({dailyBudget:20});assert.throws(()=>b.spendAllowed(1.01));assert.throws(()=>b.spendAllowed(.11,{kind:'research'}));assert.throws(()=>b.spendAllowed(.31,{kind:'revision'}));assert.throws(()=>b.spendAllowed(1.01,{kind:'ai'}));
  b.charge({id:'cost-1',kind:'production',amount:.8,productId:'unit-budget',detail:'fixture'});b.charge({id:'cost-1',kind:'production',amount:.8,productId:'unit-budget',detail:'fixture'});assert.throws(()=>b.spendAllowed(.3,{productId:'unit-budget'}));assert.equal(b.overview().summary.cost,.8);
 }finally{await f.close();}
});
test('QA failure returns to production once, and permanent rejection never lists',async()=>{
 for(const permanent of [false,true]){const f=await fixture({websiteBuilder(o,attempt){const p=buildWebsite(o,attempt);if(permanent||attempt===0)p.files['README.md']='';return p;}});try{
  await f.api('/api/business/config',{mode:'DEMO'});const result=await f.cycle(),d=(await f.api('/api/business')).data;
  assert.equal(d.products[0].iterations,2);assert.equal(d.listings.length,permanent?0:1);assert.equal(result.state,permanent?'failed':'completed');assert.equal(d.products[0].status,permanent?'QA_FAILED':'SELLING');
 }finally{await f.close();}}
});
test('capability assignment, sustained scale-up, maximum agents and surplus scale-down are bounded',async()=>{
 const f=await fixture();try{
  await f.api('/api/business/config',{mode:'DEMO',maxAgents:23,scaleCooldown:0,scaleSustainMs:0,idleScaleDownMs:0,maxVariantsPerProduct:0});
  assert.equal((await f.cycle()).state,'completed');let d=f.app.business.overview();assert.ok(d.agents.some(a=>a.dynamic));assert.ok(d.summary.activeAgents<=23);assert.ok(d.agents.some(a=>a.capabilities.includes('html-qa')&&a.jobsCompleted>0));
  for(let i=0;i<20;i++)f.app.business.capacity();assert.ok(f.app.business.overview().summary.activeAgents<=23);
  await f.cycle();await f.cycle();f.app.business.capacity();d=f.app.business.overview();assert.equal(d.summary.activeAgents,22);assert.ok(d.agents.some(a=>a.dynamic&&a.deactivated));
 }finally{await f.close();}
});
test('scale, optimize, pause and kill decisions require sufficient independent data',()=>{
 const base={views:150,orders:3,conversionRate:.02,netProfit:50,supportRate:0,ageDays:10,costCoverage:true,lossWindows:0};
 assert.equal(performanceDecision(base).action,'SCALE');assert.equal(performanceDecision({...base,orders:0,conversionRate:0}).action,'OPTIMIZE');assert.equal(performanceDecision({...base,views:2,orders:0,conversionRate:0}).action,'PAUSE');assert.equal(performanceDecision({...base,netProfit:-1}).action,'PAUSE');assert.equal(performanceDecision({...base,netProfit:-1,lossWindows:3}).action,'KILL');assert.equal(performanceDecision({...base,costCoverage:false}).action,'CONTINUE');
});
test('STOP preserves business worker freeze and resume completes a checkpoint without duplicate revenue',async()=>{
 const timing={fastBusiness:false},f=await fixture(timing);try{
  await f.api('/api/business/config',{mode:'DEMO'});await f.api('/api/business/cycle',{});await f.api('/api/factory/stop',{});
  const agents=(await f.api('/api/agents')).data.agents;assert.ok(agents.every(a=>a.state==='STOPPED'));assert.equal((await f.api('/api/jobs')).data.jobs[0].state,'paused');
  timing.fastBusiness=true;await f.restart();await f.api('/api/factory/start',{});for(let i=0;i<100;i++){if((await f.api('/api/jobs')).data.jobs[0].state!=='running')break;await new Promise(r=>setTimeout(r,5));}assert.equal((await f.api('/api/jobs')).data.jobs[0].state,'completed');assert.equal((await f.api('/api/business')).data.summary.orders,3);
 }finally{await f.close();}
});

async function until(check){for(let i=0;i<600;i++){if(await check())return;await new Promise(r=>setTimeout(r,5));}throw Error('Timed out waiting for production');}
test('continuous production fills three lanes, claims each opportunity once and waits between research refreshes',async()=>{
 let f,maxBuilding=0,collections=0;
 f=await fixture({schedulerTickMs:5,stageDelayMs:15,researchProvider:{async collect(){collections++;return Array.from({length:7},(_,i)=>({...example,title:'Concurrent site '+i,niche:'Concurrent niche '+i}));}},websiteBuilder(o,a){const tasks=f.app.db.prepare('SELECT data FROM agents').all().map(r=>JSON.parse(r.data)).filter(w=>w.current_room==='website'||w.destination==='website').filter(w=>w.active_task&&!w.inspection);maxBuilding=Math.max(maxBuilding,tasks.length);assert.equal(new Set(tasks.map(w=>w.active_task)).size,tasks.length);return buildWebsite(o,a);}});
 try{
  assert.equal((await f.api('/api/business/config',{continuousProduction:1,maxConcurrentJobs:3,maxVariantsPerProduct:0})).status,200);
  await until(()=>f.app.business.overview().products.filter(p=>p.pagePath).length===7);
  await until(()=>f.app.db.prepare("SELECT count(*) n FROM jobs WHERE state='running'").get().n===0);
  const d=f.app.business.overview();assert.ok(maxBuilding>=2,'multiple workers must build concurrently');assert.equal(d.products.length,7);assert.equal(d.summary.orders,0);assert.equal(d.production.active,0);assert.equal(d.production.state,'WAITING_FOR_RESEARCH');assert.equal(collections,1);assert.match(f.app.db.prepare("SELECT message FROM jobs WHERE kind='business' AND state='completed' ORDER BY created_at DESC LIMIT 1").get().message,/7 listing packages/);
  const jobs=f.app.db.prepare("SELECT checkpoint FROM jobs WHERE kind='business-item'").all();assert.equal(jobs.length,7);assert.equal(new Set(jobs.map(j=>JSON.parse(j.checkpoint).businessOpportunity)).size,7);
  await f.api('/api/business/import',{opportunities:[{...example,title:'Late arriving site',niche:'Late arrival'}]});
  await until(()=>f.app.business.overview().products.filter(p=>p.pagePath).length===8);
  await until(()=>f.app.db.prepare("SELECT count(*) n FROM jobs WHERE state='running'").get().n===0);
  assert.equal(collections,1,'new work does not refetch sources within cooldown');
  await f.restart();assert.equal(f.app.business.config().continuousProduction,1);assert.equal(f.app.business.needsRun(),false);assert.equal(f.app.business.overview().products.length,8);
 }finally{await f.close();}
});

test('STOP and restart retain every parallel checkpoint and resume without duplicate products or orders',async()=>{
 const f=await fixture({schedulerTickMs:5,stageDelayMs:35});try{
  await f.api('/api/business/config',{mode:'DEMO',continuousProduction:1,maxConcurrentJobs:3,maxVariantsPerProduct:0});
  await until(()=>f.app.business.productionStatus().active===3);
  assert.equal((await f.api('/api/factory/stop',{})).status,200);
  const items=f.app.db.prepare("SELECT id,state FROM jobs WHERE kind='business-item'").all();assert.equal(items.length,3);assert.ok(items.every(j=>j.state==='paused'));
  assert.equal(f.app.business.productionStatus().state,'PAUSED');assert.ok((await f.api('/api/agents')).data.agents.every(a=>a.state==='STOPPED'&&!a.active_task));
  await f.restart();assert.equal((await f.api('/api/status')).data.factory_running,false);
  await f.api('/api/factory/start',{});
  await until(()=>f.app.business.overview().products.filter(p=>p.pagePath).length===3);
  await until(()=>f.app.db.prepare("SELECT count(*) n FROM jobs WHERE state='running'").get().n===0);
  const d=f.app.business.overview();assert.equal(d.products.length,3);assert.equal(d.orders.length,9);assert.equal(d.summary.revenue,283.5);
  assert.deepEqual(f.app.db.prepare("SELECT id FROM jobs WHERE kind='business-item' ORDER BY id").all().map(j=>j.id),items.map(j=>j.id).sort());
  assert.equal(f.app.db.prepare("SELECT count(*) n FROM jobs WHERE state='paused'").get().n,0);
 }finally{await f.close();}
});

test('continuous production obeys the daily budget and rejects unbounded lane counts',async()=>{
 let collections=0;const f=await fixture({schedulerTickMs:5,researchProvider:{async collect(){collections++;return [example];}}});try{
  for(const maxConcurrentJobs of [0,5,2.5])assert.equal((await f.api('/api/business/config',{maxConcurrentJobs})).status,400);
  assert.equal((await f.api('/api/business/config',{researchIntervalMs:100})).status,400);
  await f.api('/api/business/config',{continuousProduction:1,maxConcurrentJobs:3,dailyBudget:0});
  await new Promise(r=>setTimeout(r,40));assert.equal(collections,0);assert.equal(f.app.business.productionStatus().state,'BUDGET_LIMIT');assert.equal(f.app.business.overview().products.length,0);
 }finally{await f.close();}
});
test('parallel lanes share the spending limit and a failed QA lane does not stop healthy products',async()=>{
 const candidates=Array.from({length:3},(_,i)=>({...example,title:'Parallel budget '+i,niche:'Budget fixture '+i}));
 const f=await fixture({schedulerTickMs:5,stageDelayMs:10,researchProvider:{async collect(){return candidates;}}});try{
  await f.api('/api/business/config',{continuousProduction:1,maxConcurrentJobs:3,localCostPerMinute:.1,dailyBudget:.25,maxVariantsPerProduct:0});
  await until(()=>f.app.business.overview().products.length===3);
  await until(()=>f.app.db.prepare("SELECT count(*) n FROM jobs WHERE state='running'").get().n===0);
  const d=f.app.business.overview();assert.equal(d.summary.cost,.2);assert.equal(d.products.filter(p=>p.pagePath).length,2);assert.equal(d.products.filter(p=>p.status==='BUDGET_PAUSED').length,1);
 }finally{await f.close();}
 const g=await fixture({schedulerTickMs:5,stageDelayMs:10,researchProvider:{async collect(){return candidates;}},websiteBuilder(o,a){const built=buildWebsite(o,a);if(o.title.endsWith('1'))built.files['index.html']='<broken>';return built;}});try{
  await g.api('/api/business/config',{continuousProduction:1,maxConcurrentJobs:3,maxVariantsPerProduct:0});
  await until(()=>g.app.business.overview().products.length===3);
  await until(()=>g.app.db.prepare("SELECT count(*) n FROM jobs WHERE state='running'").get().n===0);
  const d=g.app.business.overview();assert.equal(d.products.filter(p=>p.pagePath).length,2);assert.equal(d.products.filter(p=>p.status==='QA_FAILED').length,1);assert.equal(g.app.business.catalog().products.length,2);
 }finally{await g.close();}
});

test('persisted pause/kill decisions act on listings and count distinct loss days, not repeated evaluations',async()=>{
 const f=await fixture();try{
  await f.api('/api/business/config',{mode:'DEMO',killLossWindows:2,maxVariantsPerProduct:0});await f.cycle();const p=f.app.business.overview().products[0];
  const initial=f.app.db.prepare('SELECT * FROM business_reports WHERE product_id=?').get(p.id),old=JSON.parse(initial.data);old.window=new Date(Date.now()-4*86400000).toISOString();f.app.db.prepare('UPDATE business_reports SET data=? WHERE id=?').run(JSON.stringify(old),initial.id);
  const loss=days=>({id:'loss-day-'+days,window:new Date(Date.now()-days*86400000).toISOString(),views:10,clicks:2,orders:1,fees:120,note:'SIMULATED loss window'});
  let result=await f.api('/api/business/metrics',{productId:p.id,report:loss(2)});assert.equal(result.data.decision.action,'PAUSE');assert.equal(f.app.business.overview().products[0].status,'PAUSED');
  await f.api('/api/business/analyze',{productId:p.id});assert.equal(f.app.business.metrics(p.id).lossWindows,1);
  result=await f.api('/api/business/metrics',{productId:p.id,report:loss(1)});assert.equal(result.data.decision.action,'KILL');assert.equal(f.app.business.overview().products[0].status,'KILLED');assert.equal(f.app.business.overview().listings[0].status,'PAUSED');
  await f.restart();assert.equal(f.app.business.overview().products[0].status,'KILLED');
 }finally{await f.close();}
});

test('research-only action creates a scored queue without products; manual costs are idempotent and mode isolated',async()=>{
 const f=await fixture();try{
  await f.api('/api/business/config',{mode:'DEMO'});assert.equal((await f.api('/api/business/research',{})).status,202);
  for(let i=0;i<100;i++){if((await f.api('/api/jobs')).data.jobs[0].state!=='running')break;await new Promise(r=>setTimeout(r,5));}
  assert.equal(f.app.business.overview().products.length,0);assert.equal(f.app.business.overview().summary.queued,3);
  const cost={id:'hosting-invoice-test',kind:'hosting',amount:2,detail:'Simulated hosting invoice'};await f.api('/api/business/cost',cost);await f.api('/api/business/cost',cost);assert.equal(f.app.business.overview().summary.cost,2.01);
  assert.equal((await f.api('/api/business/cost',{...cost,amount:3})).status,409);
  await f.api('/api/business/config',{mode:'LIVE'});assert.equal(f.app.business.overview().summary.cost,0);
 }finally{await f.close();}
});

import {validateBrief,assertDistinctBrief} from '../product-planner.mjs';
const designBrief=i=>({audience:['Ceramic artisans','Wedding florists','Mountain guides','Bicycle workshops','Book restorers','Portrait photographers','Dance instructors','Garden designers'][i%8],purpose:['Commission a vase','Arrange bridal bouquets','Plan a hiking itinerary','Request wheel repairs','Restore a manuscript','Book a portrait enquiry','Find evening classes','Design a courtyard'][i%8],brand:'Craft '+i,headline:'A focused enquiry for your next project',intro:'A demonstration website for discussing a carefully scoped commission.',section:'Explore the possibilities',cards:[0,1,2].map(j=>['Section '+i+' '+j,Array.from({length:20},(_,k)=>'craft'+String.fromCharCode(97+i)+String.fromCharCode(97+j)+String.fromCharCode(97+k)).join(' ')]),steps:['Describe your needs','Discuss the details','Confirm the scope'],questions:['What are your requirements?','When is the work needed?','Which details should we discuss?'],sample:'A hypothetical enquiry. Replace with your own accurate information.'});
test('generated briefs reject code and repeated concepts, then render persisted original sections',()=>{
 const b=validateBrief(designBrief(0));assert.throws(()=>validateBrief({...designBrief(0),intro:'<script>bad</script>'}));assert.throws(()=>validateBrief({...designBrief(0),intro:'Receive updates on your permit status in our dashboard'}));assert.throws(()=>assertDistinctBrief(b,[b]));assertDistinctBrief(validateBrief(designBrief(1)),[b]);
 const o=normalizeOpportunity({...example,niche:b.audience,deliverable:'generated-website-v1',websiteBrief:b},'LIVE');assert.deepEqual(o.websiteBrief,b);const built=buildWebsite(o);assert.match(built.html,/craftaaa/);assert.equal(inspectZip(built.zip).length,6);
});
test('planner fills batches from distinct researched sources and persists bounded adaptations',async()=>{
 let count=0;const f=await fixture({schedulerTickMs:5,planningIntervalMs:25,researchProvider:{async collect(){return [];}},async planWebsite(){return designBrief(count++);}});
 try{
  f.app.business.importOpportunities([0,1,2].map(i=>({...example,niche:'Creative agency '+i,priceEvidence:example.priceEvidence.map(e=>({...e,url:e.url+'/'+i}))})),'live-adapter');
  await f.api('/api/business/config',{continuousProduction:1,maxConcurrentJobs:3});
  await until(()=>f.app.business.catalog().products.length>=7);
  await f.api('/api/factory/stop',{});const before=f.app.business.catalog().products.length;
  assert.ok(before>=7);assert.ok(count>=4);assert.ok(f.app.business.overview().products.filter(p=>p.websiteBrief).every(p=>p.creationStrategy==='local-ai-brief-with-safe-renderer'));
  const ids=f.app.business.overview().products.map(p=>p.id);assert.equal(ids.length,new Set(ids).size);
  await f.restart();assert.equal(f.app.business.catalog().products.length,before);assert.equal(f.app.business.productionStatus().state,'PAUSED');
  assert.ok(f.app.db.prepare("SELECT value FROM settings WHERE key='business_planner_LIVE'").get());
 }finally{await f.close();}
});


test('planner records rejected identities and supplies them on the next attempt after restart',async()=>{
 let phase=0;const prompts=[];
 const f=await fixture({planningIntervalMs:0,researchProvider:{async collect(){return [];}},async planWebsite(prompt){prompts.push(prompt);return designBrief(phase++<2?0:1);}});
 try{
  f.app.business.importOpportunities([{...example,niche:'Creative agency'}],'live-adapter');await f.api('/api/business/config',{continuousProduction:1,maxConcurrentJobs:1});
  await f.cycle();await f.cycle();await f.cycle();
  const saved=f.app.business.productionStatus().planner;assert.ok(saved.rejections.some(r=>r.reason==='Duplicate audience and purpose'));
  await f.api('/api/factory/stop',{});await f.restart();assert.deepEqual(f.app.business.productionStatus().planner.rejections,saved.rejections);
  await f.api('/api/factory/start',{});await f.cycle();assert.match(prompts.at(-1),/Recent rejected attempts.*Duplicate audience and purpose/s);
  assert.ok(f.app.business.overview().opportunities.some(o=>o.websiteBrief?.audience===designBrief(1).audience));
 }finally{await f.close();}
});


test('automatic crew survives SQLite restart and supplies real build, QA and product-page work',async()=>{
 const f=await fixture({schedulerTickMs:999999});try{
  for(const [department,target]of [['website',50],['quality',6],['thumbnails',4]])assert.equal((await f.api('/api/crew',{department,target})).status,200);
  await f.api('/api/business/config',{mode:'DEMO',maxConcurrentJobs:3,maxVariantsPerProduct:0});
  let crew=(await f.api('/api/crew',{action:'automatic',automatic:true})).data;assert.equal(crew.active,22);assert.equal(crew.total,74);
  assert.equal((await f.api('/api/business/research',{})).status,202);for(let i=0;i<400&&(await f.api('/api/jobs')).data.jobs[0].state==='running';i++)await new Promise(r=>setTimeout(r,5));
  crew=(await f.api('/api/crew',{action:'rebalance'})).data;assert.equal(crew.active,25);assert.equal(crew.allocation.targets.product,3);
  await f.restart();crew=(await f.api('/api/crew')).data;assert.equal(crew.automatic,true);assert.equal(crew.total,74);assert.equal((await f.api('/api/crew',{department:'website',target:50})).status,409);
  for(let i=0;i<3;i++)assert.equal((await f.cycle()).state,'completed');
  const data=(await f.api('/api/business')).data;assert.equal(data.products.length,3);assert.ok(data.products.every(p=>p.qualityScore===100&&p.assignments.some(a=>a.capability==='listing-package')));
  for(const p of data.products)assert.equal((await f.api(p.pagePath)).status,200);
  assert.equal((await f.api('/api/crew')).data.total,74);
 }finally{await f.close();}
});
