import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createResearchProduction} from '../research-production.mjs';

const evidence=[1,2].map(i=>({url:'https://source'+i+'.example/reference',title:'Thumbnail design templates '+i,observation:'Test source excerpt, not verified demand'}));
function fixture(research=async()=>({references:evidence,status:'SEARCHED'})){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE business_opportunities(id TEXT,mode TEXT,data TEXT);CREATE TABLE studio_products(id TEXT PRIMARY KEY,data TEXT,package BLOB);');
 const options={db,research,imageAvailable:()=>true,ensureRunning(){},jobStage(){},log(){}};
 return {db,options,queue:createResearchProduction(options),job:{id:'research',controller:new AbortController()}};
}
test('research can find a supported product without any website seeds, persists its handoff and recovers completion',async()=>{
 const {db,options,queue,job}=fixture();
 try{
  assert.equal(await queue.discover(job),1);assert.equal(await queue.discover(job),0);
  const r=queue.pending()[0];assert.equal(r.type,'thumbnail');assert.equal(r.evidence.length,2);assert.equal(r.status,'QUEUED');
  queue.finish(r,'PRODUCING');assert.equal(queue.pending().length,0);
  const recovered=createResearchProduction(options);assert.equal(recovered.pending()[0].productId,r.productId);
  db.prepare('INSERT INTO studio_products VALUES(?,?,?)').run(r.productId,JSON.stringify({status:'READY'}),Buffer.from('artifact'));
  const complete=createResearchProduction(options);assert.equal(complete.rows()[0].status,'COMPLETE');assert.equal(complete.pending().length,0);
 }finally{db.close();}
});
test('failed, empty, duplicate-only and unsafe research never enters production',async()=>{
 for(const research of [async()=>{throw Error('offline');},async()=>({references:[]}),async()=>({references:[evidence[0],evidence[0]]}),async()=>({references:[{url:'https://youtube.com',title:'YouTube',observation:'Enjoy videos'},{url:'https://wikipedia.org',title:'Wikipedia',observation:'An encyclopedia'}]}),async()=>({references:[evidence[0],{url:'file:///secret',title:'Bad'}]})]){
  const {db,queue,job}=fixture(research);
  try{await assert.rejects(queue.discover(job));assert.equal(queue.rows().length,0);assert.equal(await queue.discover(job),0);}finally{db.close();}
 }
});
test('STOP during web research saves no finding; failed builds retry with a bounded cooldown',async()=>{
 let job;const f=fixture(async()=>{job.controller.abort();return {references:evidence};});job=f.job;
 try{await assert.rejects(f.queue.discover(job));assert.equal(f.queue.pending().length,0);}finally{f.db.close();}
 const {db,queue,job:next}=fixture();
 try{
  await queue.discover(next);const r=queue.pending()[0];
  queue.finish(r,'PRODUCING');queue.finish(r,'QUEUED');assert.equal(r.attempts,0);assert.equal(queue.pending().length,1);
  for(let i=1;i<=3;i++){
   queue.finish(r,'PRODUCING');queue.finish(r,'FAILED','renderer unavailable');assert.equal(queue.pending().length,0);
   r.nextRetryAt=0;db.prepare('UPDATE creative_research_queue SET data=? WHERE id=?').run(JSON.stringify(r),r.id);
   assert.equal(queue.pending().length,i<3?1:0);
  }
 }finally{db.close();}
});
