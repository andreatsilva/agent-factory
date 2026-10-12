import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSalesEngine,checkPng} from '../sales-engine.mjs';
import {renderSalesBrief} from '../sales-renderer.mjs';
import {createFactory} from '../server.mjs';
import {inspectZip} from '../zip.mjs';
import {upstream} from './providers.mjs';

const brief={client:'SAMPLE · Queue test',request:'Two original text thumbnails',headline:'AUTOMATIC PRODUCTION',brand:'FACTORY NOTES',subtitle:'Made without a browser',accent:'#e8a83e'};
function queued(e){const c=e.create(brief);e.action(c.id,{action:'proposal'});e.action(c.id,{action:'approve-local'});return c.id;}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('server worker produces real, distinct PNGs with no DOM',async()=>{
 const images=await renderSalesBrief(brief,new AbortController().signal);
 assert.equal(images.length,2);assert.notEqual(images[0],images[1]);
 images.forEach(s=>checkPng(Buffer.from(s,'base64')));
 const c=new AbortController();c.abort();await assert.rejects(renderSalesBrief(brief,c.signal));
 const mid=new AbortController(),pending=renderSalesBrief(brief,mid.signal);mid.abort();await assert.rejects(pending);
});

test('queue has one owner, pauses in flight without publishing, and resumes once',async()=>{
 const db=new DatabaseSync(':memory:');let running=true,calls=0;const started=deferred();
 const ensureRunning=()=>{if(!running)throw Error('Paused');};
 const e=createSalesEngine({db,ensureRunning,log(){},render:async(b,signal)=>{
  calls++;if(calls===1){started.resolve();await new Promise((r,j)=>signal.addEventListener('abort',()=>j(signal.reason),{once:true}));}
  return renderSalesBrief(b,signal);
 }});
 try{
  const id=queued(e),p=e.tick();await started.promise;assert.equal(e.tick(),p);assert.equal(e.overview().summary.producing,1);
  running=false;await e.pause();await p;assert.equal(e.overview().cases[0].state,'QUEUED');assert.equal(e.overview().cases[0].production.failures,0);assert.throws(()=>e.artifact(id),/No artifact/);
  await e.tick();assert.equal(calls,1);running=true;await e.tick();await e.tick();assert.equal(calls,2);assert.equal(e.overview().cases[0].state,'REVIEW_REQUIRED');assert.equal(e.artifact(id).version,1);
  assert.equal(JSON.parse(inspectZip(e.artifact(id).package).find(f=>f.name==='manifest.json').data).renderer,'server-canvas-text-compositor-v1');
 }finally{await e.pause();db.close();}
});

test('transient failures back off and stop after three; retry is explicit and later jobs still run',async()=>{
 const db=new DatabaseSync(':memory:');let time=0,calls=0;
 const e=createSalesEngine({db,ensureRunning(){},log(){},clock:()=>time,retryDelayMs:10,render:async()=>{calls++;throw Error('Renderer unavailable');}});
 try{
  const id=queued(e);await e.tick();await e.tick();assert.equal(calls,1);
  time=10;await e.tick();time=30;await e.tick();assert.equal(e.overview().cases[0].state,'PRODUCTION_FAILED');await e.tick();assert.equal(calls,3);
  const other=queued(e);await e.tick();assert.equal(e.overview().cases.find(c=>c.id===other).production.failures,1);
  e.action(id,{action:'retry-production'});assert.equal(e.overview().cases.find(c=>c.id===id).production.failures,0);
 }finally{db.close();}
});

test('interrupted claim recovers on restart; failed visual QA requires changed brief',async()=>{
 const db=new DatabaseSync(':memory:');const opts={db,ensureRunning(){},log(){}};let e=createSalesEngine(opts);
 try{
  const id=queued(e),c=e.overview().cases[0];c.state='PRODUCING';c.production={claim:'old',attempts:1,failures:0};db.prepare('UPDATE sales_cases SET data=? WHERE id=?').run(JSON.stringify(c),id);
  e=createSalesEngine(opts);assert.equal(e.overview().cases[0].state,'QUEUED');await e.tick();assert.equal(e.overview().cases[0].state,'REVIEW_REQUIRED');
  e.action(id,{action:'qa',passed:false,note:'Headline needs a correction'});await e.tick();assert.equal(e.artifact(id).version,1);
  assert.throws(()=>e.action(id,{action:'correction'}),/Change the brief/);
  e.action(id,{action:'correction',headline:'CORRECTED HEADLINE'});await e.tick();assert.equal(e.artifact(id).version,2);assert.equal(e.overview().cases[0].revisions,0);assert.equal(e.overview().cases[0].qa.visualPassed,null);
 }finally{await e.pause();db.close();}
});

test('HTTP queue works without a browser, honors START/STOP, and survives SQLite reopen',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'neo-sales-queue-'));let app,base;
 const start=async()=>{app=createFactory({dataDir:dir,fetch:upstream().fetch,env:{FACTORY_INTERVAL_SECONDS:'999999'},sales:{schedulerTickMs:20,fastCrew:true}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;};
 const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.ok(r.ok,await r.clone().text());return r.json();};
 try{
  await start();await api('/api/factory/stop',{});
  const c=await api('/api/sales/cases',brief);await api('/api/sales/action',{id:c.id,action:'proposal'});await api('/api/sales/action',{id:c.id,action:'approve-local'});
  await new Promise(r=>setTimeout(r,80));assert.equal((await api('/api/sales')).cases[0].state,'QUEUED');
  await app.close();app=null;await start();assert.equal((await api('/api/sales')).production.running,false);
  await api('/api/factory/start',{});
  let data;for(let i=0;i<200;i++){data=await api('/api/sales');if(data.cases[0].state==='REVIEW_REQUIRED')break;await new Promise(r=>setTimeout(r,25));}
  assert.equal(data.cases[0].state,'REVIEW_REQUIRED');assert.equal(data.cases[0].version,1);assert.equal(data.summary.realRevenue,0);
  const upload=await fetch(base+'/api/sales/produce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:c.id})});assert.equal(upload.status,409);
  const pkg=Buffer.from(await (await fetch(base+'/api/sales/package?id='+c.id)).arrayBuffer());assert.equal(inspectZip(pkg).length,5);
  await app.close();app=null;await start();assert.equal((await api('/api/sales')).cases[0].version,1);
  assert.deepEqual(Buffer.from(await (await fetch(base+'/api/sales/package?id='+c.id)).arrayBuffer()),pkg);
 }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true});}
});
