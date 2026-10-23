import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {capacityFor,routeModels} from '../hardware-policy.mjs';
import {buildStudioProduct,validateStudioBrief} from '../studio-products.mjs';
import {createStudioEngine} from '../studio-engine.mjs';
import {createFactory} from '../server.mjs';
import {createViewerServer} from '../viewer-server.mjs';
import {createFactoryCrew} from '../factory-crew.mjs';
import {initialWorkers,registerModuleRoutes} from '../workers.mjs';
import {ensureModuleLayout} from '../factory-modules.mjs';
import {emptyLayout,bayRooms} from '../layout.mjs';
import {inspectZip} from '../zip.mjs';
import {upstream} from './providers.mjs';
import {parseResearchFeed} from '../creative-research.mjs';
const brief={brand:'Moss Studio',headline:'Plan your next garden session',description:'An original focused checklist and creative concept for independent garden designers.',accent:'#45bca2',items:['Choose a planting area','Measure available space','Sketch the layout']};
test('hardware upgrade raises bounded capacity and routes only installed models that fit',()=>{
 const low={ramGiB:16,freeGiB:8,cpuThreads:8,gpu:{vramGiB:4}},high={ramGiB:64,freeGiB:40,cpuThreads:24,gpu:{vramGiB:24}};
 assert.ok(capacityFor(high).maxAgents>capacityFor(low).maxAgents);assert.equal(capacityFor(high).lanes,4);assert.equal(capacityFor({...low,freeGiB:1}).pressure,true);assert.equal(capacityFor(high).inferenceSlots,1);
 const tags=[['qwen3:1.7b',1.3],['qwen3:8b',4.9],['qwen3:14b',9],['qwen2.5-coder:7b',4.4],['embedding:latest',.2]].map(([name,size])=>({name,size:size*1024**3}));
 assert.equal(routeModels(tags,low).high,'qwen3:1.7b');const routed=routeModels(tags,high);assert.equal(routed.simple,'qwen3:1.7b');assert.equal(routed.medium,'qwen2.5-coder:7b');assert.equal(routed.high,'qwen3:14b');assert.equal(routeModels([],high).high,null);
});
test('all creative product builders produce valid artifacts without executing model-supplied code',async()=>{
 for(const kind of ['thumbnail','logo','app']){
  const out=await buildStudioProduct(kind,brief,'ST-test',new AbortController().signal),files=inspectZip(out.zip);assert.ok(out.qa.passed);assert.ok(out.preview.length>1000);assert.ok(files.some(f=>f.name==='README.md'));
  if(kind==='thumbnail')assert.ok(files.some(f=>f.name==='thumbnail-2.png'));
  if(kind==='logo')assert.ok(files.some(f=>f.name==='logo.svg'));
  if(kind==='app'){assert.ok(out.html.includes('localStorage'));assert.ok(out.html.includes('deadline-Date.now()'));assert.ok(!out.html.includes('fetch('));}
 }
 assert.throws(()=>validateStudioBrief({...brief,headline:'<script>bad</script>'}));
 assert.throws(()=>validateStudioBrief({...brief,accent:'url(https://evil)'}));
});
test('creative queue builds all four types, survives saved artifacts and public gateway isolates demos from controls',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'neo-studio-test-')),options={dataDir:dir,fetch:upstream().fetch,business:{schedulerTickMs:999999,researchProvider:{async collect(){return [];}}}};
 const app=createFactory(options);await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 let viewer;
 try{
  app.db.prepare('INSERT INTO business_opportunities VALUES(?,?,?,?)').run('seed','LIVE','seed',JSON.stringify({id:'seed',niche:'Garden design',evidence:[{url:'https://example.com/public',observation:'Public fixture evidence, not demand'}]}));
  const db=app.db,workers=()=>db.prepare('SELECT data FROM agents').all().map(r=>JSON.parse(r.data)),saveWorker=w=>db.prepare('UPDATE agents SET data=? WHERE id=?').run(JSON.stringify(w),w.id);
  const sample=await buildStudioProduct('logo',brief,'sample',new AbortController().signal);
  const calls=[],engine=createStudioEngine({generateImage:async()=>({png:sample.preview,metadata:{model:'image-fixture',seed:7}}),db,workers,saveWorker,ensureRunning(){},jobStage(){},log(){},fast:true,research:async()=>({references:[{url:'https://first.example/one',title:'Thumbnail templates, logo design, pomodoro timer and illustration download',observation:'Fixture'},{url:'https://second.example/two',title:'Thumbnail templates, logo design, pomodoro timer and illustration download',observation:'Fixture'}],status:'TEST_ONLY'}),model:t=>t+'-test',generate:async(t,p,structured)=>{calls.push(t);return structured?brief:'Related audience hypothesis; no claimed demand.';}});
  for(let i=0;i<4;i++){db.prepare("DELETE FROM settings WHERE key='creative_discovery'").run();db.prepare("INSERT INTO settings VALUES('creative_discovery',?)").run(JSON.stringify({sequence:i,nextAt:0}));assert.equal(await engine.run({id:'test-'+i,controller:new AbortController()}),1);}
  assert.equal(engine.researchQueue().filter(r=>r.status==='COMPLETE').length,4);assert.ok(engine.overview().products.every(p=>p.sourceOpportunity.startsWith('CR-')));
  assert.deepEqual(engine.catalog().map(p=>p.type).sort(),['app','image','logo','thumbnail']);assert.ok(engine.catalog().every(p=>p.priceCents===null));assert.deepEqual(calls,['simple','high','simple','high','simple','medium','simple','high']);
  const appProduct=engine.catalog().find(p=>p.type==='app');assert.ok(engine.artifact(appProduct.id).package.length>1000);
  viewer=createViewerServer({factoryUrl:base});await new Promise(r=>viewer.listen(0,'127.0.0.1',r));const gateway='http://127.0.0.1:'+viewer.address().port;
  const catalog=await(await fetch(gateway+'/products')).json();assert.equal(catalog.products.length,4);assert.equal(catalog.products.filter(p=>p.type==='image').length,1);assert.ok(!JSON.stringify(catalog).includes('sourceOpportunity'));
  for(const product of catalog.products){assert.equal(product.priceCents,0);assert.equal(product.pricingStatus,'FREE');assert.equal(product.downloadAvailable,true);const download=await fetch(gateway+'/download/'+product.id);assert.equal(download.status,200);assert.equal(download.headers.get('content-type'),'application/zip');assert.equal(download.headers.get('cache-control'),'no-store');assert.match(download.headers.get('content-disposition'),/attachment/);assert.ok(inspectZip(Buffer.from(await download.arrayBuffer())).length>=3);}
  assert.equal((await fetch(gateway+'/download/missing')).status,404);
  assert.equal((await fetch(gateway+'/download/'+appProduct.id,{method:'POST'})).status,405);
  assert.equal((await fetch(gateway+'/download/'+appProduct.id+'?path=data/factory.sqlite')).status,404);
  const demo=await fetch(gateway+'/demo/'+appProduct.id);assert.equal(demo.status,200);assert.ok(demo.headers.get('content-security-policy').includes('sandbox allow-scripts'));assert.ok(!demo.headers.get('content-security-policy').includes('allow-same-origin'));
  assert.equal((await fetch(gateway+'/preview/'+appProduct.id)).headers.get('content-type'),'image/png');
  assert.equal((await fetch(gateway+'/demo/'+appProduct.id,{method:'POST'})).status,405);
  assert.equal((await fetch(gateway+'/preview/'+appProduct.id,{headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(gateway+'/api/studio/export?id='+appProduct.id)).status,404);
  assert.equal((await fetch(gateway+'/operator/studio-export/'+appProduct.id,{headers:{Origin:'https://andreatsilva.github.io'}})).status,401);
 }finally{if(viewer)await new Promise(r=>viewer.close(r));await app.close();rmSync(dir,{recursive:true,force:true});}
});
test('automatic crew creates missing roles when hardware capacity and queue demand allow it',()=>{
 let layout=ensureModuleLayout(emptyLayout());registerModuleRoutes(bayRooms(layout));const db=new Map(initialWorkers().map(w=>[w.id,w]));
 const crew=createFactoryCrew({workers:()=>[...db.values()],saveWorker:w=>db.set(w.id,w),isRunning:()=>true,log(){},getLayout:()=>layout,saveLayout:v=>layout=v,getPolicy:()=>({automatic:true}),getDemand:()=>({lanes:4,queued:4,maxAgents:100})});
 const before=db.size;crew.rebalance({force:true});assert.ok(db.size>before);assert.ok(db.size<=100);assert.ok([...db.values()].some(w=>w.id.startsWith('AUTO-')&&!w.deactivated));
});
test('research extracts bounded search references without treating snippets as verified prices',()=>{
 const xml='<rss><item><title>Template &amp; design</title><link>https://example.com/item</link><description>Public listing excerpt</description></item><item><title>Bad</title><link>javascript:alert(1)</link></item></rss>';
 const rows=parseResearchFeed(xml);assert.equal(rows.length,1);assert.equal(rows[0].title,'Template & design');assert.ok(rows[0].basis.includes('not verified'));assert.equal(rows[0].price,undefined);
});

test('disabling the temporary giveaway closes public downloads without removing artifacts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'neo-free-off-'));
 const app=createFactory({dataDir:dir,env:{FREE_PUBLIC_DOWNLOADS:'0'},fetch:upstream().fetch,business:{schedulerTickMs:999999,researchProvider:{async collect(){return [];}}}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 try{
  const id='ST-aaaaaaaaaaaaaaaaaaaaaaaa',out=await buildStudioProduct('logo',brief,id,new AbortController().signal);
  app.db.prepare('INSERT INTO studio_products VALUES(?,?,?,?,?)').run(id,JSON.stringify({id,type:'logo',title:'Test logo',status:'READY',scopeVersion:1,niche:'Garden',description:'An editable concept',files:out.files,features:[],createdAt:new Date().toISOString()}),out.zip,out.preview,null);
  const base='http://127.0.0.1:'+app.server.address().port;
  assert.equal((await fetch(base+'/api/public/download/'+id)).status,403);
  assert.equal((await fetch(base+'/api/public/download/missing')).status,404);
  const product=(await(await fetch(base+'/api/public/products')).json()).products[0];assert.equal(product.downloadAvailable,false);assert.equal(product.priceCents,null);
  assert.ok(app.studio.artifact(id).package.length>100);
 }finally{await app.close();rmSync(dir,{recursive:true,force:true});}
});
