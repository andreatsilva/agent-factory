import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createFactory} from '../server.mjs';
import {createViewerServer} from '../viewer-server.mjs';
import {passwordRecord} from '../operator-auth.mjs';
import {inspectZip} from '../zip.mjs';
import {upstream} from './providers.mjs';
const listen=async server=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;};
test('marketplace HTTP workflow, authenticated gateway and persisted package survive restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'neo-market-http-')),options={dataDir:dir,fetch:upstream().fetch,env:{FACTORY_INTERVAL_SECONDS:'999999'},business:{schedulerTickMs:999999,researchProvider:{async collect(){return [];}}},marketplaces:{fast:true,schedulerTickMs:20}};let app=createFactory(options),base=await listen(app.server),viewer;
 const local=async(path,body)=>{const r=await fetch(base+path,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});assert.equal(r.status,200,await r.clone().text());return r.json();};
 try{
  await local('/api/factory/stop',{});const password='test-marketplace-only-password';viewer=createViewerServer({factoryUrl:base,operatorRecord:await passwordRecord('admin',password)});const gateway=await listen(viewer);
  const api=(path,body,token)=>fetch(gateway+path,{method:body?'POST':'GET',headers:{Origin:'https://andreatsilva.github.io',...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const fake='MP-00000000-0000-0000-0000-000000000000';for(const [path,body]of [['/operator/marketplaces'],['/operator/marketplace-export/'+fake],['/operator/action/marketplace',{action:'create'}]])assert.equal((await api(path,body)).status,401);
  const {token}=await(await api('/operator/login',{username:'admin',password})).json();assert.equal((await api('/operator/marketplace-export/'+fake+'?url=http://evil.test',undefined,token)).status,404);assert.equal((await api('/operator/action/marketplace',{action:'publish',id:fake},token)).status,400);
  const input={action:'create',channel:'etsy',kind:'website',title:'HTTP test website',niche:'Independent makers',notes:'Private operator notes',priceEvidence:[{url:'https://example.com/price',amount:25,currency:'EUR',observedAt:new Date().toISOString(),license:'Single-project test scope'}]};assert.equal((await api('/operator/action/marketplace',input,token)).status,200);let jobs=(await(await api('/operator/marketplaces',undefined,token)).json()).jobs;assert.equal(jobs[0].status,'QUEUED');const id=jobs[0].id;
  assert.equal((await api('/operator/marketplace-export/'+id,undefined,token)).status,404);await local('/api/factory/start',{});
  for(let i=0;i<100;i++){jobs=(await local('/api/marketplaces')).jobs;if(jobs[0].status==='REVIEW_REQUIRED')break;await new Promise(r=>setTimeout(r,20));}assert.equal(jobs[0].status,'REVIEW_REQUIRED',jobs[0].error);
  const bundle=await(await api('/operator/marketplace-export/'+id,undefined,token)).json();assert.ok(inspectZip(Buffer.from(bundle.base64,'base64')).some(f=>f.name==='marketplace-listing.json'));assert.ok(bundle.previews.some(f=>f.name==='index.html'));
  assert.equal((await api('/operator/action/marketplace',{action:'review',id,version:jobs[0].version,passed:true,note:'Preview verified'},token)).status,200);await local('/api/factory/stop',{});
  const snapshot=await local('/api/public/snapshot');assert.equal(snapshot.marketplaces.find(c=>c.id==='etsy').ready,1);assert.ok(!JSON.stringify(snapshot).includes('Private operator notes'));assert.equal((await fetch(gateway+'/api/marketplaces')).status,404);
  await new Promise(r=>viewer.close(r));viewer=null;await app.close();app=createFactory(options);base=await listen(app.server);assert.equal((await local('/api/marketplaces')).jobs[0].status,'LISTING_READY');assert.deepEqual(await local('/api/marketplaces/export?id='+id),bundle);assert.equal((await local('/api/status')).factory_running,false);
 }finally{if(viewer)await new Promise(r=>viewer.close(r));await app.close();rmSync(dir,{recursive:true,force:true});}
});
