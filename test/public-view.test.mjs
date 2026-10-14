import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPublicSnapshot,sanitizeSnapshot} from '../public-snapshot.mjs';
import {createViewerServer} from '../viewer-server.mjs';
import {buildPages} from '../build-pages.mjs';
import {validateFeedUrl,readPublicSnapshot} from '../viewer-client.mjs';
import {createFactory} from '../server.mjs';
import {initialWorkers} from '../workers.mjs';
import {ensureModuleLayout} from '../factory-modules.mjs';
import {emptyLayout} from '../layout.mjs';
import {upstream} from './providers.mjs';
const snapshot=(time=Date.now())=>createPublicSnapshot({time,running:true,layout:ensureModuleLayout(emptyLayout()),agents:initialWorkers(time).map(a=>({...a,name:'PRIVATE CLIENT',task_description:'PRIVATE BRIEF',active_task:'SECRET JOB',last_failure:'TOKEN',role:'PRIVATE ROLE',state:'WORKING'})),business:{products:[{title:'PRIVATE PRODUCT',status:'READY',price:500}],summary:{queued:3,revenue:9999}},sales:{summary:{queued:2,producing:1,review:4},cases:[{email:'private@example.com'}]}});
const listen=async server=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;};
test('public snapshot publishes only bounded geometry, activity and counts',()=>{
 const s=snapshot(),text=JSON.stringify(s);for(const word of ['PRIVATE','SECRET','TOKEN','revenue','email','price','cases','active_task','last_failure'])assert.ok(!text.includes(word),word);
 assert.equal(s.counts.ready,1);assert.equal(s.counts.thumbnailQueued,2);assert.equal(s.agents.length,14);assert.equal(s.layout.bays.length,2);
 assert.deepEqual(sanitizeSnapshot({...s,token:'secret',agents:[...s.agents,{id:'evil',home:'constructor',role:'private'}]}),s);
 assert.equal(sanitizeSnapshot({...s,agents:s.agents.map(a=>({...a,speed:1e12,route:[{x:Infinity,y:-1e20}]}))}).agents[0].speed,200);
});
test('viewer cannot proxy private routes, mutations, arbitrary URLs or credentials',async()=>{
 let calls=0,now=Date.now(),online=true;
 const server=createViewerServer({now:()=>now,request:async(url,opts)=>{calls++;assert.equal(url.href,'http://127.0.0.1:8787/api/public/snapshot');assert.equal(opts.headers,undefined);if(!online)throw Error('SECRET PATH');return new Response(JSON.stringify({...snapshot(now),token:'PRIVATE'}));}}),base=await listen(server);
 try{
  for(const path of ['/','/api/factory/stop','/api/neo/chat','/api/sales','/data/factory.sqlite','/snapshot?url=http://example.com','//snapshot'])assert.equal((await fetch(base+path)).status,404,path);
  for(const method of ['POST','PUT','DELETE','PATCH'])assert.equal((await fetch(base+'/snapshot',{method,body:'{}'})).status,405);
  assert.equal((await fetch(base+'/snapshot',{headers:{Origin:'https://other.example'}})).status,403);assert.equal(calls,0);
  const preflight=await fetch(base+'/snapshot',{method:'OPTIONS',headers:{Origin:'https://andreatsilva.github.io','Access-Control-Request-Method':'GET'}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-credentials'),null);
  const responses=await Promise.all(Array.from({length:12},()=>fetch(base+'/snapshot',{headers:{Origin:'https://andreatsilva.github.io',Authorization:'PRIVATE'}})));
  assert.equal(calls,1);for(const r of responses){assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'https://andreatsilva.github.io');assert.ok(!(await r.text()).includes('PRIVATE'));}
  now+=3000;online=false;const offline=await fetch(base+'/snapshot');assert.equal(offline.status,503);assert.ok(!(await offline.text()).includes('SECRET'));
 }finally{await new Promise(r=>server.close(r));}
 assert.throws(()=>createViewerServer({factoryUrl:'http://example.com'}),/loopback/);
});
test('local public endpoint remains separate from private operator API',async()=>{
 const dataDir=mkdtempSync(join(tmpdir(),'factory-public-')),remote=upstream(),app=createFactory({dataDir,fetch:remote.fetch,env:{FACTORY_INTERVAL_SECONDS:'999999',LOCAL_AI_ENABLED:'0'}});
 try{const base=await listen(app.server);const worker=JSON.parse(app.db.prepare('SELECT data FROM agents LIMIT 1').get().data);worker.task_description='PRIVATE CLIENT BRIEF';worker.name='PRIVATE PERSON';app.db.prepare('UPDATE agents SET data=? WHERE id=?').run(JSON.stringify(worker),worker.id);
  const r=await fetch(base+'/api/public/snapshot'),s=await r.json();assert.equal(r.status,200);assert.ok(!JSON.stringify(s).includes('PRIVATE'));assert.equal(s.agents.length,18);
  assert.equal((await fetch(base+'/api/public/snapshot',{method:'POST',body:'{}'})).status,404);
  for(const path of ['/viewer-config.mjs','/viewer-client.mjs','/public-snapshot.mjs','/neo-face.mjs'])assert.equal((await fetch(base+path)).status,200,path);
  assert.equal((await fetch(base+'/viewer-server.mjs')).status,404);
 }finally{await app.close();rmSync(dataDir,{recursive:true,force:true});}
});
test('Pages allowlist works at a repository subpath and excludes local files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'factory-pages-'));
 try{
  const out=buildPages({outDir:dir,feedUrl:'https://feed.example.com/snapshot'});assert.equal(out.files,18);
  const files=readdirSync(dir);for(const privateFile of ['server.mjs','data','.env','business-console.mjs','sales-console.mjs','neo-console.mjs','test-output','README.md'])assert.ok(!files.includes(privateFile),privateFile);
  const html=readFileSync(join(dir,'index.html'),'utf8');assert.ok(!/from '\//.test(html));assert.ok(html.includes('connect-src https://feed.example.com'));assert.ok(html.includes('sha256-'));
  const config=readFileSync(join(dir,'viewer-config.mjs'),'utf8');assert.ok(config.includes('"publicView":true'));assert.ok(config.includes('https://feed.example.com/snapshot'));
  assert.ok(readFileSync(join(dir,'worker-sprites.mjs'),'utf8').includes("new URL('./assets/"));
  writeFileSync(join(dir,'private.txt'),'private');assert.throws(()=>buildPages({outDir:dir}),/Unexpected Pages output/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('public client rejects credential URLs and stale snapshots; omits browser credentials',async()=>{
 for(const value of ['http://public.example/snapshot','https://user:password@feed.example/snapshot','https://feed.example/snapshot?key=secret','https://feed.example/api/status','https://feed.example/snapshot#token'])assert.throws(()=>validateFeedUrl(value));
 assert.equal(validateFeedUrl(''), '');
 const url='https://feed.example/snapshot',s=snapshot();
 assert.deepEqual(await readPublicSnapshot(url,async(u,opts)=>{assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');return new Response(JSON.stringify(s));}),s);
 await assert.rejects(readPublicSnapshot(url,async()=>new Response(JSON.stringify(snapshot(Date.now()-60000)))),/stale/);
 await assert.rejects(readPublicSnapshot(''),/not configured/);
});
