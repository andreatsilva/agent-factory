import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFactoryCrew} from '../factory-crew.mjs';
import {initialWorkers,registerModuleRoutes} from '../workers.mjs';
import {ensureModuleLayout} from '../factory-modules.mjs';
import {emptyLayout,bayRooms} from '../layout.mjs';
import {validateOperatorAction} from '../operator-gateway.mjs';
function fixture(){let layout=ensureModuleLayout(emptyLayout()),policy={automatic:false},demand={lanes:3,maxAgents:70,limits:{website:8,quality:3,product:4}},running=true,time=Date.now();registerModuleRoutes(bayRooms(layout));const records=new Map(initialWorkers(time-100000).map(w=>[w.id,w]));const workers=()=>[...records.values()],saveWorker=w=>records.set(w.id,w);const crew=createFactoryCrew({workers,saveWorker,isRunning:()=>running,log(){},getLayout:()=>layout,saveLayout:v=>layout=v,getPolicy:()=>policy,savePolicy:v=>policy=v,getDemand:()=>demand,clock:()=>time});return {crew,workers,saveWorker,demand,setRunning:v=>running=v,advance:ms=>time+=ms,get time(){return time;}};}
function populated(){const f=fixture();for(const [department,target] of [['website',50],['quality',6],['thumbnails',4]])f.crew.resize({department,target});return f;}
test('automatic allocation retains 74 identities and history, reserves surplus and reuses roles for queued work',()=>{
 const f=populated();assert.equal(f.workers().length,74);const ids=f.workers().map(w=>w.id).sort();for(const w of f.workers())f.saveWorker({...w,jobsCompleted:7});
 let out=f.crew.configure({automatic:true});assert.equal(out.active,22);assert.equal(out.reserve,52);assert.equal(out.automatic,true);assert.throws(()=>f.crew.resize({department:'website',target:50}),e=>e.status===409);
 f.demand.queued=3;out=f.crew.rebalance({force:true});assert.equal(out.active,25);assert.equal(out.allocation.targets.quality,3);assert.equal(out.allocation.targets.product,3);assert.ok(out.allocation.moved>=1);assert.deepEqual(f.workers().map(w=>w.id).sort(),ids);assert.ok(f.workers().every(w=>w.jobsCompleted===7));assert.ok(f.workers().some(w=>w.managed&&!w.deactivated&&w.home==='product'&&w.capabilities.includes('listing-package')));
 f.demand.queued=0;f.advance(15001);f.crew.tick();assert.equal(f.crew.overview().active,25,'cooldown prevents rapid reserve churn');f.advance(90001);f.crew.tick();assert.equal(f.crew.overview().active,22);
});
test('busy jobs and inspections survive forced balancing, pause freezes assignments and budgets bound new allocations',()=>{
 const f=populated(),w=f.workers().find(w=>w.managed&&!w.coreModule&&w.home==='website');const job={...w,state:'WORKING',active_task:'real-job',jobsCompleted:12};f.saveWorker(job);f.setRunning(false);f.crew.configure({automatic:true});assert.equal(f.crew.overview().active,74);f.setRunning(true);f.crew.rebalance({force:true});assert.deepEqual(f.workers().find(a=>a.id===w.id),job);assert.equal(f.crew.overview().active,23);
 f.demand.queued=4;f.demand.maxAgents=24;f.crew.rebalance({force:true});assert.equal(f.crew.overview().active,24);assert.equal(f.crew.overview().departments.find(d=>d.id==='quality').active,2);
 f.demand.maxAgents=1;f.crew.rebalance({force:true});assert.equal(f.crew.overview().active,23,'core crew and running jobs take priority over a smaller new cap');
 f.saveWorker({...job,active_task:null,state:'IDLE',idleSince:f.time});f.advance(90001);f.crew.tick();assert.equal(f.crew.overview().active,22);
});
test('operator automatic allocation payloads reject extra proxy fields and invalid types',()=>{
 assert.deepEqual(validateOperatorAction('crew',{action:'automatic',automatic:true}),{action:'automatic',automatic:true});
 for(const body of [{action:'automatic',automatic:'true'},{action:'automatic',automatic:true,url:'http://evil.test'},{action:'rebalance',target:124},{action:'unknown'}])assert.throws(()=>validateOperatorAction('crew',body));
});
