import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createFactory} from '../server.mjs';
import {FACTORY_MODULES} from '../factory-modules.mjs';
import vm from 'node:vm';
import http from 'node:http';

import {upstream} from './providers.mjs';
import {inspectZip} from '../zip.mjs';
async function fixture(env={}){
 const dataDir=mkdtempSync(join(tmpdir(),'neo-test-')),remote=upstream();
 let app=createFactory({dataDir,fetch:remote.fetch,env:{FACTORY_INTERVAL_SECONDS:'999999',...env}});
 async function listen(){await new Promise(r=>app.server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+app.server.address().port;}
 let base=await listen();
 const api=async(path,body,extra={})=>{const r=await fetch(base+path,{...(body!==undefined?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),...extra});const text=await r.text();return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?JSON.parse(text):text,headers:r.headers};};
 return {remote,api,get app(){return app;},async restart(){await app.close();app=createFactory({dataDir,fetch:remote.fetch,env:{FACTORY_INTERVAL_SECONDS:'999999',...env}});base=await listen();},async close(){await app.close();rmSync(dataDir,{recursive:true,force:true});}};
}
async function finish(f){for(let n=0;n<150;n++){const jobs=(await f.api('/api/jobs')).data.jobs;if(jobs[0]?.state!=='running')return jobs[0];await new Promise(r=>setTimeout(r,10));}throw Error('Job timed out');}

test('expansion bays persist across restart, work in gaming mode and reject conflicting edits',async()=>{
 const f=await fixture();try{
  for(const path of ['/camera.mjs','/layout.mjs','/api/layout'])assert.equal((await f.api(path)).status,200);
  await f.api('/api/factory/stop',{});
  assert.equal((await f.api('/api/layout',{action:'add',side:'east',type:'servers',revision:1})).status,200);
  assert.equal((await f.api('/api/layout',{action:'add',side:'north',type:'storage',revision:0})).status,409);
  assert.equal((await f.api('/api/layout',{action:'add',side:'east',type:'unknown',revision:2})).status,400);
  await f.restart();const saved=(await f.api('/api/layout')).data;assert.equal(saved.revision,2);assert.equal(saved.bays.at(-1).type,'servers');
  assert.equal((await f.api('/api/status')).data.factory_running,false);
  assert.equal((await f.api('/api/layout',{action:'remove',id:saved.bays.at(-1).id,revision:2})).status,200);
  assert.equal((await f.api('/api/layout')).data.bays.length,FACTORY_MODULES.length);
 }finally{await f.close();}
});

test('all read routes, syntax, unknown routes, malformed requests and local origin guards',async()=>{
 const f=await fixture();try{
  for(const path of ['/','/index.html','/store.html','/success.html','/api/status','/api/local-ai/status','/api/dashboard','/api/products','/api/opportunities?limit=100','/api/events','/api/jobs','/api/agents','/workers.mjs','/api/research/sources','/api/research/candidates','/api/product-specs','/api/qa','/api/usage','/api/maintenance','/factory-art.mjs','/scene-art.mjs','/worker-sprites.mjs','/assets/factory-worker-walk-v1.png','/assets/factory-worker-work-v1.png'])assert.equal((await f.api(path)).status,200,path);
  assert.equal((await f.api('/favicon.ico')).status,204);
  for(const p of ['/missing','/server.mjs','/data/factory.sqlite','/.env'])assert.equal((await f.api(p)).status,404,p);
  assert.equal((await f.api('/api/status',undefined,{method:'DELETE'})).status,405);
  assert.equal((await f.api('/api/factory/start',undefined,{method:'POST',body:'{bad'})).status,400);
  assert.equal((await f.api('/api/factory/start',undefined,{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'})).status,403);
  const badHost=await new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port:f.app.server.address().port,path:'/api/status',headers:{Host:'evil.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});assert.equal(badHost,403);
  assert.equal((await f.api('/api/neo/think',{})).status,400);
  assert.equal((await f.api('/api/local-ai/test',{})).status,200);
  assert.equal((await f.api('/api/neo/think',{prompt:'Plan a toolkit'})).status,200);
  assert.equal((await f.api('/api/coder/think',{prompt:'Code a calculator'})).status,200);
  assert.equal((await f.api('/api/download?token=forged')).status,403);
  assert.equal((await f.api('/api/orders/status?session_id=forged')).status,404);
  assert.equal((await f.api('/api/products/preview?id=missing')).status,404);
  assert.equal((await f.api('/api/opportunities?limit=1.5')).status,200);
  assert.equal((await f.api('/api/events?after=Infinity')).status,200);
  for(const file of ['index.html','store.html','success.html']){
   const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');for(const script of html.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g))new vm.Script(script[1].replace(/^import .*;$/gm,''),{filename:file});
  }
 }finally{await f.close();}
});
test('research → NEO → coder → QA → publication, source escaping, deduplication and restart persistence',async()=>{
 const f=await fixture();try{
  assert.equal((await f.api('/api/research/refresh',{})).status,202);assert.equal((await finish(f)).state,'completed');
  assert.equal((await f.api('/api/dashboard')).data.opportunities,1);assert.equal((await f.api('/api/dashboard')).data.products,0);
  assert.equal((await f.api('/api/factory/cycle',{})).status,202);assert.equal((await finish(f)).state,'completed');
  const products=(await f.api('/api/products')).data.products;assert.equal(products.length,1);assert.ok(products.every(p=>p.price_cents===2000));
  assert.equal(inspectZip(f.app.db.prepare('SELECT package FROM products').get().package).length,7);
  assert.equal((await f.api('/api/product-specs')).data.specifications[0].brief.price_cents,2000);
  assert.equal((await f.api('/api/qa')).data.reports[0].passed,1);
  const modelCalls=f.remote.calls.filter(c=>c.url.endsWith('/generate')&&JSON.parse(c.body).prompt).length;
  assert.equal((await f.api('/api/products/preview?id='+products[0].id)).status,200);
  assert.equal((await f.api('/api/products/export?id='+products[0].id)).status,200);
  assert.equal((await f.api('/api/products/export?id=missing')).status,404);
  assert.equal((await f.api('/api/products/export?id='+products[0].id+'&view=1')).headers.get('content-disposition'),null);
  assert.equal((await f.api('/api/checkout/create',{product_id:products[0].id})).data.needs_account,true);
  for(const row of f.app.db.prepare('SELECT artifact FROM products').all()){assert.ok(row.artifact.includes('Export JSON atlas'));assert.ok(!row.artifact.includes('<img src=x'));new vm.Script(row.artifact.match(/<script>([\s\S]*?)<\/script>/)[1]);}
  await f.api('/api/factory/cycle',{});await finish(f);assert.equal((await f.api('/api/products')).data.products.length,1);
  assert.equal(f.remote.calls.filter(c=>c.url.endsWith('/generate')&&JSON.parse(c.body).prompt).length,modelCalls,'Unchanged evidence and existing products must not spend new inference tokens');
  await f.restart();assert.equal((await f.api('/api/products')).data.products.length,1);assert.equal((await f.api('/api/dashboard')).data.sales,0);
 }finally{await f.close();}
});
test('paid delivery enforces €20, rejects unverified payment, persists idempotent order access',async()=>{
 const f=await fixture({STRIPE_SECRET_KEY:'sk_test_fixture_only'});try{
  await f.api('/api/factory/cycle',{});await finish(f);const p=(await f.api('/api/products')).data.products[0];
  assert.equal((await f.api('/api/checkout/create',{product_id:'fake'})).status,404);
  assert.equal((await f.api('/api/checkout/create',{product_id:p.id,price_cents:1})).status,200);
  assert.equal((await f.api('/api/orders/status?session_id=cs_test_fixture')).data.paid,false);
  f.remote.paid=true;f.remote.amount=1;assert.equal((await f.api('/api/orders/status?session_id=cs_test_fixture')).data.paid,false);
  f.remote.amount=2000;const paid=(await f.api('/api/orders/status?session_id=cs_test_fixture')).data;assert.equal(paid.paid,true);
  assert.equal((await f.api(paid.download_url)).status,200);assert.match((await f.api(paid.download_url)).headers.get('content-disposition'),/attachment/);
  assert.equal((await f.api('/api/orders/status?session_id=cs_test_fixture')).data.download_url,paid.download_url);
  await f.restart();assert.equal((await f.api(paid.download_url)).status,200);const d=(await f.api('/api/dashboard')).data;assert.equal(d.sales,1);assert.equal(d.revenue,20);
 }finally{await f.close();}
});
test('STOP aborts active jobs, prevents queued work, unloads both models and persists across restart',async()=>{
 const f=await fixture();try{
  f.remote.block=true;f.remote.loaded=['qwen3:8b','qwen2.5-coder:7b'];await f.api('/api/factory/cycle',{});
  for(let n=0;n<50;n++){if(f.remote.calls.some(c=>c.url.endsWith('/generate')))break;await new Promise(r=>setTimeout(r,10));}
  assert.equal((await f.api('/api/factory/cycle',{})).status,409);
  const stopped=await f.api('/api/factory/stop',{});assert.equal(stopped.data.unload.verified,true);
  const workersBefore=(await f.api('/api/agents')).data.agents;assert.ok(workersBefore.every(w=>w.state==='STOPPED'));
  assert.equal((await f.api('/api/jobs')).data.jobs[0].state,'paused');assert.equal((await f.api('/api/products')).data.products.length,0);
  for(const path of ['/api/factory/cycle','/api/research/refresh','/api/local-ai/test','/api/neo/think','/api/coder/think'])assert.equal((await f.api(path,{prompt:'Hello'})).status,409,path);
  await f.restart();assert.equal((await f.api('/api/status')).data.factory_running,false);f.remote.block=false;
  assert.deepEqual((await f.api('/api/agents')).data.agents.map(w=>[w.id,w.x,w.y]),workersBefore.map(w=>[w.id,w.x,w.y]));
  await f.api('/api/factory/start',{});await finish(f);assert.equal((await f.api('/api/local-ai/test',{})).status,200);
 }finally{await f.close();}
});
test('NEO rejection prevents manufacture; invalid coder output retries then uses original checked documentation',async()=>{
 const rejected=await fixture();try{rejected.remote.reject=true;await rejected.api('/api/factory/cycle',{});await finish(rejected);assert.equal((await rejected.api('/api/products')).data.products.length,0);assert.equal((await rejected.api('/api/opportunities')).data.opportunities[0].decision,'rejected');}finally{await rejected.close();}
 const retried=await fixture();try{retried.remote.badCoder=true;await retried.api('/api/factory/cycle',{});assert.equal((await finish(retried)).state,'completed');assert.equal((await retried.api('/api/products')).data.products.length,1);assert.equal(retried.remote.calls.filter(c=>c.url.endsWith('/generate')&&JSON.parse(c.body).model==='qwen2.5-coder:7b'&&JSON.parse(c.body).prompt).length,2);assert.equal((await retried.api('/api/qa')).data.reports[0].passed,1);}finally{await retried.close();}
});
test('unavailable AI is explicit; live-source failure does not manufacture products',async()=>{
 const f=await fixture();try{
  f.remote.offline=true;assert.equal((await f.api('/api/local-ai/status')).data.reachable,false);assert.equal((await f.api('/api/local-ai/test',{})).status,503);
  await f.api('/api/factory/cycle',{});assert.equal((await finish(f)).state,'completed');assert.ok((await f.api('/api/opportunities')).data.opportunities.every(o=>o.decision==='needs_review'));
  f.remote.networkDown=true;f.app.db.prepare('UPDATE source_cache SET expires_at=0').run();await f.api('/api/research/refresh',{});assert.equal((await finish(f)).state,'failed');
  assert.equal((await f.api('/api/factory/stop',{})).data.unload.verified,false);
 }finally{await f.close();}
});
test('invalid model JSON falls back transparently and disabled AI returns an explicit error',async()=>{
 const f=await fixture();try{
  f.remote.badAI=true;await f.api('/api/factory/cycle',{});assert.equal((await finish(f)).state,'completed');
  assert.ok((await f.api('/api/opportunities')).data.opportunities.every(o=>o.decision==='needs_review'));
  assert.equal((await f.api('/api/products')).data.products.length,0);
 }finally{await f.close();}
 const disabled=await fixture({LOCAL_AI_ENABLED:'0'});try{assert.equal((await disabled.api('/api/local-ai/status')).data.enabled,false);assert.equal((await disabled.api('/api/local-ai/test',{})).status,503);}finally{await disabled.close();}
});


test('NEO chat uses live context, remembers turns, rejects duplicates and survives restart',async()=>{
 const f=await fixture();try{
  assert.equal((await f.api('/neo-console.mjs')).status,200);
  assert.equal((await f.api('/api/neo/chat',{id:'chat-test-001',message:' '})).status,400);
  const first=await f.api('/api/neo/chat',{id:'chat-test-001',message:'How is the factory doing?'});
  assert.equal(first.status,200);assert.equal(first.data.status,'complete');
  const call=f.remote.calls.find(c=>c.body&&JSON.parse(c.body).system?.includes('central AI'));
  const prompt=JSON.parse(JSON.parse(call.body).prompt);assert.equal(prompt.live_factory.separate_legacy_live_store.economics.sales,0);
  assert.equal(prompt.live_factory.business.mode,'LIVE');assert.equal(prompt.live_factory.business.summary.orders,0);
  assert.equal(prompt.live_factory.workers.active,18);assert.equal(prompt.live_factory.workers.total,18);assert.deepEqual(prompt.live_factory.workers.inactive,[]);
  assert.match(JSON.parse(call.body).system,/cannot execute commands/);
  const count=f.remote.calls.length;
  assert.equal((await f.api('/api/neo/chat',{id:'chat-test-001',message:'How is the factory doing?'})).data.response,first.data.response);
  assert.equal(f.remote.calls.length,count);
  assert.equal((await f.api('/api/neo/chat',{id:'chat-test-001',message:'Something else'})).status,409);
  await f.api('/api/neo/chat',{id:'chat-test-002',message:'What did I just ask?'});
  const latest=f.remote.calls.filter(c=>c.body&&JSON.parse(c.body).prompt).at(-1);
  assert.equal(JSON.parse(JSON.parse(latest.body).prompt).recent_conversation[0].message,undefined);
  assert.equal(JSON.parse(JSON.parse(latest.body).prompt).recent_conversation[0].operator,'How is the factory doing?');
  await f.restart();assert.equal((await f.api('/api/neo/chat')).data.turns.length,2);
  await f.api('/api/factory/stop',{});
  assert.equal((await f.api('/api/neo/chat',{id:'chat-test-003',message:'Hello'})).status,409);
  assert.equal((await f.api('/api/neo/chat')).data.turns.length,2);
 }finally{await f.close();}
});

test('STOP cancels an in-flight NEO reply; errors persist without invented answers',async()=>{
 const f=await fixture();try{
  f.remote.block=true;
  const pending=f.api('/api/neo/chat',{id:'chat-stop-001',message:'Help me plan.'});
  for(let i=0;i<50&&!f.remote.calls.some(c=>c.body&&JSON.parse(c.body).prompt);i++)await new Promise(r=>setTimeout(r,5));
  assert.equal((await f.api('/api/neo/chat',{id:'chat-stop-002',message:'Second message'})).status,409);
  assert.equal((await f.api('/api/factory/stop',{})).status,200);
  assert.equal((await pending).status,503);
  const turn=(await f.api('/api/neo/chat')).data.turns[0];assert.equal(turn.status,'failed');assert.equal(turn.response,null);
  await f.api('/api/factory/start',{});f.remote.block=false;f.remote.offline=true;
  assert.equal((await f.api('/api/neo/chat',{id:'chat-offline-001',message:'Are you there?'})).status,503);
  assert.equal((await f.api('/api/neo/chat')).data.turns.at(-1).status,'failed');
 }finally{await f.close();}
});
