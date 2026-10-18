import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createMarketplaceEngine} from '../marketplace-engine.mjs';
import {initialWorkers,registerModuleRoutes} from '../workers.mjs';
import {ensureModuleLayout} from '../factory-modules.mjs';
import {emptyLayout,bayRooms,changeLayout} from '../layout.mjs';
import {orbitalRooms,roomFor,stationFor} from '../orbital-map.mjs';
import {roomBlueprint,roomPath,pathIsClear} from '../orbital-rooms.mjs';
import {inspectZip} from '../zip.mjs';
import {renderSalesBrief} from '../sales-renderer.mjs';
import {sanitizeSnapshot} from '../public-snapshot.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const evidence=()=>[{url:'https://example.com/comparable',amount:30,currency:'EUR',observedAt:new Date().toISOString(),license:'Test single-project license'}];
const brief=(channel,kind)=>({action:'create',channel,kind,title:channel+' original '+kind,niche:'Independent makers',notes:'Fixture only: comparable package scope reviewed',priceEvidence:evidence(),headline:'BUILD YOUR FIRST SITE',brand:'MAKER NOTES',subtitle:'A practical start',accent:'#e8a83e'});
function fixture(options={}){const db=new DatabaseSync(':memory:'),layout=ensureModuleLayout(emptyLayout());registerModuleRoutes(bayRooms(layout));const records=new Map(initialWorkers().slice(0,3).map(w=>[w.id,{...w,inspection:null,deactivated:false}]));let running=true;const opts={db,workers:()=>[...records.values()],saveWorker:w=>records.set(w.id,w),ensureRunning:()=>{if(!running)throw Error('Paused');},config:()=>({maxAgents:124,priceDiscount:.1}),log(){},fast:true,...options};const e=createMarketplaceEngine(opts);return {e,db,records,opts,setRunning:v=>running=v,close:async()=>{await e.pause();db.close();}};}
async function settle(e){for(let i=0;i<300;i++){await e.tick();if(e.overview().jobs.every(j=>!['QUEUED','RESEARCHING','PRODUCING'].includes(j.status)))return;await wait(10);}throw Error('Queue did not settle: '+JSON.stringify(e.overview().jobs.map(j=>[j.status,j.error])));}
test('both marketplaces build both product types, save real ZIPs, price below evidence and require versioned review',async()=>{
 const f=fixture();try{
  for(const channel of ['fiverr','etsy'])for(const kind of ['website','thumbnail'])f.e.action(brief(channel,kind));
  await settle(f.e);const jobs=f.e.overview().jobs;assert.equal(jobs.length,4);
  for(const j of jobs){assert.equal(j.status,'REVIEW_REQUIRED',j.error);assert.equal(j.pricing.priceCents,2700);const files=inspectZip(f.e.artifact(j.id));assert.ok(files.some(f=>f.name===(j.kind==='website'?'index.html':'thumbnail-2.png')));assert.equal(j.listing.published,false);assert.equal(j.listing.account,'NOT_CONNECTED');assert.equal(j.listing.format,j.channel==='fiverr'?'SERVICE_DRAFT':'DIGITAL_DOWNLOAD_DRAFT');assert.ok(f.e.exportPackage(j.id).previews.length);assert.throws(()=>f.e.action({action:'review',id:j.id,version:0,passed:true,note:'Checked'}),/Refresh/);f.e.action({action:'review',id:j.id,version:j.version,passed:true,note:'Fixture visual review'});}
  assert.ok(f.e.overview().jobs.every(j=>j.status==='LISTING_READY'));assert.equal(f.records.size,3);assert.ok([...f.records.values()].every(w=>!w.active_task&&w.home==='website'));
  assert.throws(()=>f.e.action(brief('fiverr','website')),/already exists/);assert.throws(()=>f.e.action({...brief('ebay','website')}),/Choose Fiverr/);assert.throws(()=>f.e.action({action:'publish',id:jobs[0].id}),/Unknown marketplace/);
 }finally{await f.close();}
});
test('missing and expired research block production; corrected evidence resumes without phantom artifacts',async()=>{
 const f=fixture();try{const a=f.e.action({...brief('fiverr','website'),priceEvidence:[]}),b=f.e.action({...brief('etsy','website'),priceEvidence:evidence().map(r=>({...r,observedAt:'2020-01-01'}))});await settle(f.e);
  for(const j of [a,b]){assert.equal(f.e.get(j.id).status,'NEEDS_RESEARCH');assert.throws(()=>f.e.artifact(j.id),/not been built/);}f.e.action({action:'research',id:a.id,priceEvidence:evidence(),notes:'Current comparator captured'});await settle(f.e);assert.equal(f.e.get(a.id).status,'REVIEW_REQUIRED');
  f.e.action({action:'review',id:a.id,version:1,passed:false,note:'Needs a better design'});assert.equal(f.e.get(a.id).status,'REJECTED');assert.throws(()=>f.e.action({action:'review',id:a.id,version:1,passed:true,note:'Override'}),/Refresh/);
 }finally{await f.close();}
});
test('two wings run concurrently; pause cancels both, keeps reserve identities and resumes once',async()=>{
 let hold=true,calls=0;const f=fixture({render:async(b,signal)=>{calls++;if(hold)await new Promise((r,j)=>signal.addEventListener('abort',()=>j(signal.reason),{once:true}));return renderSalesBrief(b,signal);}});
 try{for(const [id,w]of f.records)f.records.set(id,{...w,deactivated:true,state:'OFFLINE'});for(const channel of ['fiverr','etsy'])f.e.action(brief(channel,'thumbnail'));await f.e.tick();for(let i=0;calls<2&&i<100;i++)await wait(5);assert.equal(calls,2);assert.equal(f.e.overview().channels.filter(c=>c.active).length,2);assert.equal([...f.records.values()].filter(w=>w.active_task).length,2);await f.e.tick();assert.equal(calls,2);
  f.setRunning(false);await f.e.pause();assert.ok(f.e.overview().jobs.every(j=>j.status==='QUEUED'));assert.ok([...f.records.values()].every(w=>!w.active_task&&w.deactivated));await f.e.tick();assert.equal(calls,2);hold=false;f.setRunning(true);await settle(f.e);assert.equal(calls,4);assert.ok(f.e.overview().jobs.every(j=>j.version===1));
 }finally{await f.close();}
});
test('SQLite restart recovers interrupted jobs and respects paused state and busy crew',async()=>{
 const f=fixture();try{const j=f.e.action(brief('etsy','website'));const w=[...f.records.values()][0];f.records.set(w.id,{...w,active_task:'market:'+j.id,state:'WORKING'});f.db.prepare('UPDATE marketplace_jobs SET data=? WHERE id=?').run(JSON.stringify({...j,status:'PRODUCING'}),j.id);f.setRunning(false);const recovered=createMarketplaceEngine(f.opts);assert.equal(recovered.get(j.id).status,'QUEUED');assert.equal(f.records.get(w.id).state,'STOPPED');assert.equal(f.records.get(w.id).active_task,null);await recovered.tick();assert.equal(recovered.overview().channels[1].active,0);
  for(const [id,w]of f.records)f.records.set(id,{...w,active_task:'existing-job',state:'WORKING'});f.setRunning(true);await recovered.tick();assert.equal(recovered.get(j.id).status,'QUEUED');assert.ok([...f.records.values()].every(w=>w.active_task==='existing-job'));await recovered.pause();
 }finally{await f.close();}
});
test('wide wings preserve old bays, have 24 reachable stations and expansion avoids overlap',()=>{
 const old=changeLayout(emptyLayout(),{action:'add',side:'west',type:'servers',revision:0}),legacy=ensureModuleLayout(old,[]),layout=ensureModuleLayout(legacy);
 assert.deepEqual(roomFor(old.bays[0].id,layout),roomFor(old.bays[0].id,legacy));
 for(const channel of ['fiverr','etsy']){const room=roomFor(channel,layout),b=roomBlueprint(room);assert.equal(room.w,680);assert.equal(b.sections.length,2);for(let i=0;i<24;i++)for(let j=0;j<24;j++){const target=stationFor(room,j),path=roomPath(room,stationFor(room,i),target);assert.deepEqual(path.at(-1),target);assert.ok(pathIsClear(room,path));}assert.ok(stationFor(room,14).x>room.x+360);const expanded=changeLayout(layout,{action:'add',side:room.side,type:'workshop',revision:layout.revision}),added=orbitalRooms(expanded).find(r=>r.expansion&&!layout.bays.some(b=>b.id===r.id));assert.ok(added.x+added.w<room.x||added.x>room.x+room.w);}
});
test('public marketplace status exports counts only, never briefs or listing files',()=>{
 const result=sanitizeSnapshot({version:1,generatedAt:Date.now(),running:true,layout:emptyLayout(),agents:[],counts:{},marketplaces:[{id:'etsy',queued:2,active:1,review:3,ready:4,secret:'private buyer brief'}]});assert.deepEqual(result.marketplaces[1],{id:'etsy',queued:2,active:1,review:3,ready:4});assert.ok(!JSON.stringify(result).includes('private buyer'));
});
