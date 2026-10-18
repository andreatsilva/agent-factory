import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {passwordRecord,createOperatorAuth,validateRecord} from '../operator-auth.mjs';
import {validateOperatorAction} from '../operator-gateway.mjs';
import {createOperatorClient} from '../operator-client.mjs';
import {createViewerServer} from '../viewer-server.mjs';
import {createFactory} from '../server.mjs';
import {upstream} from './providers.mjs';
const password='test-only-operator-passphrase-9274';
const recordPromise=passwordRecord('admin',password);
const origin='https://andreatsilva.github.io';
const listen=async server=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;};
test('password hashing, random sessions, expiration and revocation are server enforced',async()=>{
 const record=await recordPromise;assert.ok(!JSON.stringify(record).includes(password));assert.equal(record.hash.length,128);assert.throws(()=>validateRecord({...record,hash:'bad'}));
 let time=Date.now();const events=[],auth=createOperatorAuth({record,now:()=>time,audit:e=>events.push(e)});
 await assert.rejects(auth.login({username:'wrong',password}),e=>e.status===401);
 await assert.rejects(auth.login({username:'admin',password:'wrong'}),e=>e.status===401);
 const first=await auth.login({username:'admin',password});assert.equal(first.token.length,43);assert.equal(auth.authorize('Bearer '+first.token).username,'admin');
 const second=await auth.login({username:'admin',password});assert.notEqual(first.token,second.token);assert.throws(()=>auth.authorize(first.token),e=>e.status===401);
 auth.logout('Bearer '+first.token);assert.throws(()=>auth.authorize('Bearer '+first.token),e=>e.status===401);auth.revokeAll();assert.throws(()=>auth.authorize('Bearer '+second.token),e=>e.status===401);
 time+=900001;const expired=await auth.login({username:'admin',password});time+=3600001;assert.throws(()=>auth.authorize('Bearer '+expired.token),e=>e.status===401);
 const audit=JSON.stringify(events);assert.ok(!audit.includes(password));assert.ok(!audit.includes(first.token));
 await assert.rejects(createOperatorAuth().login({username:'admin',password}),e=>e.status===503);
});
test('login work and attempts are bounded; successful login does not reset guessing limits',async()=>{
 let time=Date.now();const auth=createOperatorAuth({record:await recordPromise,now:()=>time});
 const first=auth.login({username:'admin',password});await assert.rejects(auth.login({username:'admin',password}),e=>e.status===429);await first;
 for(let i=0;i<3;i++)await assert.rejects(auth.login({username:'admin',password:'wrong'}),e=>e.status===401);
 await assert.rejects(auth.login({username:'admin',password}),e=>e.status===429);time+=60001;
 for(let i=0;i<4;i++)await assert.rejects(auth.login({username:'admin',password:'wrong'}),e=>e.status===401);
 time+=60001;await assert.rejects(auth.login({username:'admin',password}),e=>e.status===429);time+=900000;assert.ok((await auth.login({username:'admin',password})).token);
});
test('gateway protects every operator action and controls real isolated factory state',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'neo-operator-')),remote=upstream(),app=createFactory({dataDir:dir,fetch:remote.fetch,env:{FACTORY_INTERVAL_SECONDS:'999999'},business:{fastBusiness:true,schedulerTickMs:999999,researchProvider:{async collect(){return [];}}}});
 const base=await listen(app.server),forwarded=[],viewer=createViewerServer({factoryUrl:base,operatorRecord:await recordPromise,request:async(url,opts)=>{forwarded.push({path:url.pathname,headers:opts.headers});return fetch(url,opts);}}),publicBase=await listen(viewer);
 const request=(path,{body,token,method=body===undefined?'GET':'POST',site=origin,headers={}}={})=>fetch(publicBase+path,{method,headers:{...(site?{Origin:site}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 try{
  for(const action of ['start','stop','research','cycle','config','crew','layout'])assert.equal((await request('/operator/action/'+action,{body:{}})).status,401,action);
  for(const path of ['/operator/state','/operator/logout','/operator/logout-all'])assert.equal((await request(path,path.includes('logout')?{body:{}}:{})).status,401,path);
  assert.equal((await request('/operator/state',{token:'x'.repeat(43)})).status,401);assert.equal(forwarded.length,0);
  assert.equal((await request('/operator/login',{body:{username:'admin',password},site:null})).status,403);
  assert.equal((await request('/operator/login',{body:{username:'admin',password},site:'https://evil.example'})).status,403);
  const pre=await request('/operator/action/stop',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST'}});assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),origin);
  const login=await request('/operator/login',{body:{username:'admin',password}});assert.equal(login.status,200);assert.equal(login.headers.get('set-cookie'),null);const {token}=await login.json();
  const api=async(path,body)=>{const r=await request(path,{token,body});return {status:r.status,data:await r.json()};};
  const initial=await api('/operator/state');assert.equal(initial.status,200);assert.equal(initial.data.running,true);assert.ok(!JSON.stringify(initial).includes('password'));
  for(const path of ['/operator/state?mode=DEMO','/operator/action/constructor','/api/factory/stop','/operator/action/stop?url=http://evil.example','/data/operator-auth.json'])assert.equal((await request(path,{token})).status,404,path);
  assert.equal((await api('/operator/action/start',{url:'https://evil.example'})).status,400);
  assert.equal((await api('/operator/action/config',{OLLAMA_URL:'https://evil.example'})).status,400);
  assert.equal((await request('/operator/action/stop',{token,body:{padding:'x'.repeat(9000)}})).status,413);
  assert.equal((await request('/operator/action/stop',{token,method:'GET'})).status,405);
  assert.equal((await api('/operator/action/stop',{})).status,200);assert.equal((await api('/operator/state')).data.running,false);
  assert.equal((await api('/operator/action/config',{maxConcurrentJobs:3,continuousProduction:0})).status,200);assert.equal(app.business.config().maxConcurrentJobs,3);
  const crew=initial.data.crew.departments.find(d=>d.id==='website');assert.equal((await api('/operator/action/crew',{department:'website',target:crew.active+1})).status,200);
  let layout=(await api('/operator/state')).data.layout;assert.equal((await api('/operator/action/layout',{action:'add',side:'east',type:'storage',revision:layout.revision})).status,200);
  assert.equal((await api('/operator/action/layout',{action:'add',side:'east',type:'storage',revision:layout.revision})).status,409);
  layout=(await api('/operator/state')).data.layout;const bay=layout.bays.filter(b=>b.side==='east').at(-1);assert.equal((await api('/operator/action/layout',{action:'remove',id:bay.id,revision:layout.revision})).status,200);
  assert.equal((await api('/operator/action/start',{})).status,200);assert.equal((await api('/operator/state')).data.running,true);
  assert.equal((await api('/operator/action/research',{})).status,200);
  for(const call of forwarded){assert.ok(!call.headers?.Authorization);assert.ok(!call.headers?.Origin);assert.ok(call.path.startsWith('/api/'));}
  assert.equal((await api('/operator/logout',{})).status,200);assert.equal((await api('/operator/action/stop',{})).status,401);
  assert.equal((await fetch(base+'/api/public/snapshot')).status,200,'Public feed stays available after sign-out');
 }finally{await new Promise(r=>viewer.close(r));await app.close();rmSync(dir,{recursive:true,force:true});}
});
test('action schema rejects mode switches, prototype names and arbitrary proxy fields',()=>{
 for(const [action,body]of [['constructor',{}],['config',{mode:'DEMO'}],['crew',{department:'constructor',target:1}],['crew',{department:'website',target:125}],['layout',{action:'remove',id:'../../data',revision:0}],['stop',{method:'GET'}]])assert.throws(()=>validateOperatorAction(action,body));
});
test('browser client keeps tokens off URLs, expires locally and clears revoked credentials',async()=>{
 let calls=[],expired=0,reject=false;const token='t'.repeat(43),client=createOperatorClient({feedUrl:'https://feed.example/snapshot',onExpired:()=>expired++,request:async(url,opts)=>{
  calls.push({url:String(url),opts});assert.ok(!String(url).includes(token));assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');
  if(String(url).endsWith('/login'))return Response.json({token,username:'admin',expiresAt:Date.now()+3600000});
  assert.equal(opts.headers.Authorization,'Bearer '+token);return reject?Response.json({error:'Session expired'},{status:401}):Response.json({ok:true});
 }});
 const session=await client.login('admin',password);assert.ok(!Object.hasOwn(session,'token'));await client.state();await client.action('stop');await client.logout();const count=calls.length;await assert.rejects(client.state(),/expired/);assert.equal(calls.length,count);
 await client.login('admin',password);reject=true;await assert.rejects(client.state(),/expired/);assert.ok(expired>=2);
});

test('authenticated gateway toggles automatic allocation and anonymous rebalance is denied',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'neo-crew-gateway-')),app=createFactory({dataDir:dir,fetch:upstream().fetch,env:{FACTORY_INTERVAL_SECONDS:'999999'},business:{schedulerTickMs:999999}}),base=await listen(app.server),viewer=createViewerServer({factoryUrl:base,operatorRecord:await recordPromise}),gateway=await listen(viewer);
 const post=async(path,body,token)=>{const r=await fetch(gateway+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{
  assert.equal((await post('/operator/action/crew',{action:'rebalance'})).status,401);
  const {data:{token}}=await post('/operator/login',{username:'admin',password});
  assert.equal((await post('/operator/action/crew',{action:'automatic',automatic:true},token)).status,200);
  assert.equal((await(await fetch(base+'/api/crew')).json()).automatic,true);
  assert.equal((await post('/operator/action/crew',{action:'rebalance'},token)).status,200);
  assert.equal((await post('/operator/action/crew',{department:'website',target:50},token)).status,409);
  assert.equal((await post('/operator/action/crew',{action:'automatic',automatic:false},token)).status,200);
 }finally{await new Promise(r=>viewer.close(r));await app.close();rmSync(dir,{recursive:true,force:true});}
});
