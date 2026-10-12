import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ensureModuleLayout,FACTORY_MODULES} from '../factory-modules.mjs';
import {emptyLayout,changeLayout,bayRooms} from '../layout.mjs';
import {initialWorkers,registerModuleRoutes,positionAt,freezeWorker} from '../workers.mjs';
import {createFactoryCrew} from '../factory-crew.mjs';
test('module registration preserves existing layout, reserves distinct bays and protects working lines',()=>{
 const original=changeLayout(emptyLayout(),{action:'add',side:'east',type:'storage',revision:0});
 const layout=ensureModuleLayout(original);assert.deepEqual(layout.bays[0],original.bays[0]);assert.equal(layout.bays.length,3);
 assert.deepEqual(ensureModuleLayout(layout),layout);assert.equal(new Set(layout.bays.map(b=>b.side+b.index)).size,3);
 for(const m of FACTORY_MODULES){const r=bayRooms(layout).find(r=>r.moduleId===m.id);assert.equal(r.name,m.name);assert.equal(r.stations.length,3);assert.throws(()=>changeLayout(layout,{action:'remove',id:r.id,revision:layout.revision}),/Active production/);}
 const withFuture=ensureModuleLayout(layout,[...FACTORY_MODULES,{id:'future-line',name:'Future line',type:'servers',side:'south'}]);assert.ok(withFuture.bays.some(b=>b.moduleId==='future-line'));
});
function fixture(){let layout=ensureModuleLayout(emptyLayout());registerModuleRoutes(bayRooms(layout));let running=true;const records=new Map(initialWorkers().map(w=>[w.id,w]));const workers=()=>[...records.values()],saveWorker=w=>records.set(w.id,w),crew=createFactoryCrew({workers,saveWorker,isRunning:()=>running,log(){},fast:true,getLayout:()=>layout,saveLayout:v=>{layout=v;}});return {crew,workers,saveWorker,getLayout:()=>layout,setRunning:v=>running=v};}
test('124 persisted roles are deployable, reject overflow and reactivate without new identities',()=>{
 const f=fixture(),n=f.crew.overview(),team=n.departments.find(d=>d.id==='website');const target=124-n.active+team.active;
 f.crew.resize({department:'website',target});assert.equal(f.crew.overview().active,124);assert.equal(new Set(f.workers().map(w=>w.id)).size,124);
 const deployed=f.workers().filter(w=>w.crewDock),savedLayout=structuredClone(f.getLayout());assert.equal(new Set(deployed.map(w=>w.crewDock+':'+w.crewSlot)).size,deployed.length);assert.equal(new Set(deployed.map(w=>w.x+':'+w.y)).size,deployed.length);assert.equal(savedLayout.bays.filter(b=>b.moduleId).length,2);assert.equal(savedLayout.bays.filter(b=>b.crewDepartment==='website').length,Math.ceil(deployed.length/12));
 assert.throws(()=>f.crew.resize({department:'sales',target:3}),/124/);
 f.crew.resize({department:'website',target:target-4});f.setRunning(false);f.crew.resize({department:'website',target});assert.equal(f.crew.overview().total,124);assert.equal(f.crew.overview().active,124);assert.ok(f.workers().filter(w=>w.managed&&!w.coreModule).some(w=>w.state==='STOPPED'));
 assert.deepEqual(f.getLayout(),savedLayout);assert.equal(new Set(f.workers().filter(w=>w.crewDock).map(w=>w.x+':'+w.y)).size,deployed.length);
 assert.throws(()=>f.crew.resize({department:'sales',target:0}),/original crew/);
});
test('thumbnail crew owns real sales work and moves between the sales and render bays',async()=>{
 const f=fixture(),c={id:'test-case',client:'Test'};f.crew.salesEvent(c,'proposal');assert.ok(f.workers().some(w=>w.home==='sales'&&w.jobsCompleted===1));
 await f.crew.prepare(c,new AbortController().signal);const w=f.workers().find(w=>w.active_task==='sales:test-case');assert.equal(w.destination,'thumbnails');assert.ok(w.route.length>2);assert.ok(Number.isFinite(positionAt(w).x));
 f.setRunning(false);f.saveWorker(freezeWorker(w));f.crew.finish(c,false);assert.equal(f.workers().find(a=>a.id===w.id).state,'STOPPED');assert.equal(f.workers().find(a=>a.id===w.id).active_task,null);
});
