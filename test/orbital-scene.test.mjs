import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SPRITES,PLACEMENTS} from '../orbital-assets.mjs';
import {CORE_ROOMS,orbitalBays,orbitalBounds,stationFor,roomFor,visualMotion,createMotionTracker} from '../orbital-map.mjs';
import {createOrbitalScene} from '../orbital-scene.mjs';
import {emptyLayout,changeLayout} from '../layout.mjs';
import {ensureModuleLayout} from '../factory-modules.mjs';
import {initialWorkers,assignWorker,routeDuration,positionAt} from '../workers.mjs';
const layout=ensureModuleLayout(emptyLayout());
test('orbital metadata preserves source trim, all departments and module identities',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/orbital-pack/manifest.json',import.meta.url)));
 for(const p of PLACEMENTS){const original=manifest.sprites.find(s=>s.id===p.sprite_id),sprite=SPRITES[p.sprite_id];assert.deepEqual(sprite.trim,original.trim_offset);assert.equal(sprite.frame.w,original.width);assert.equal(sprite.frame.h,original.height);}
 assert.equal(CORE_ROOMS.length,6);assert.equal(orbitalBays(layout).filter(r=>r.embedded).length,2);assert.equal(roomFor('sales',layout).sprite,'marketplace_ops');assert.equal(roomFor('thumbnails',layout).sprite,'content_creation');
 assert.deepEqual(layout,ensureModuleLayout(emptyLayout()));
});
test('all expansion arms remain reachable without moving the existing orbital rooms',()=>{
 for(const side of ['north','east','south','west']){
  const expanded=changeLayout(layout,{action:'add',side,type:'workshop',revision:layout.revision}),rooms=orbitalBays(expanded),added=rooms.find(r=>!layout.bays.some(b=>b.id===r.id)),bounds=orbitalBounds(expanded);
  assert.ok(added.expansion&&!added.embedded);assert.ok(added.x>=bounds.x&&added.y>=bounds.y&&added.x+added.w<=bounds.x+bounds.w&&added.y+added.h<=bounds.y+bounds.h);
  assert.deepEqual(roomFor('research',expanded),roomFor('research',layout));assert.deepEqual(changeLayout(expanded,{action:'remove',id:added.id,revision:expanded.revision}).bays,layout.bays);
 }
});
test('live route timestamps control transit, arrival and working destination for up to 124 agents',()=>{
 const time=1700000000000,worker=assignWorker(initialWorkers(time)[0],'website','WORKING','Build test',0,time),duration=routeDuration(worker);
 const first=visualMotion(worker,layout,time),middle=visualMotion(worker,layout,time+duration/2),last=visualMotion(worker,layout,time+duration+1);
 assert.equal(first.moving,true);assert.equal(middle.moving,true);assert.equal(last.moving,false);assert.notDeepEqual(first,middle);const target=stationFor(roomFor('website',layout),worker.station_index);assert.equal(last.x,target.x);assert.equal(last.y,target.y);
 for(let i=0;i<124;i++){const point=visualMotion({...worker,id:'TEST-'+i,station_index:i},layout,time+duration+1);assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));}
});
test('real PNG renderer loads all layers; paused/offline and reduced motion freeze visual effects',async()=>{
 const canvas=createCanvas(1448,640),ctx=canvas.getContext('2d'),scene=createOrbitalScene(ctx,()=>{},{makeCanvas:createCanvas,loadImage:url=>loadImage(fileURLToPath(url))});await scene.ready;assert.equal(scene.failed,false);assert.ok(scene.base());
 const time=1700000000000,agent={...initialWorkers(time)[0],destination:'website',current_room:'website',state:'WORKING',route:[{x:150,y:150}]};
 const paint=(running,at,reduced=false)=>{ctx.clearRect(0,0,1448,640);scene.draw({layout,agents:[agent],running,online:true,time:at,now:time+at,reduced});return createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex');};
 const active=paint(true,100);assert.notEqual(active,paint(true,3000));assert.equal(paint(false,100),paint(false,4000));assert.equal(paint(true,100,true),paint(true,4000,true));
 const data=scene.base().getContext('2d').getImageData(0,0,1448,640).data;let opaque=0,transparent=0;for(let i=3;i<data.length;i+=4){if(data[i]>200)opaque++;if(!data[i])transparent++;}assert.ok(opaque>300000,'rooms must render actual detailed art');assert.ok(transparent>100000,'space remains transparent between rooms');
});
test('public route trimming does not reset worker motion and pause preserves the rendered position',()=>{
 const time=1700000000000,worker=assignWorker(initialWorkers(time)[0],'research','WORKING','Research',0,time),tracker=createMotionTracker();
 tracker.sample(worker,layout,time,true);const before=tracker.sample(worker,layout,time+2000,true),physical=positionAt(worker,time+2000),snapshot={...worker,route:[{x:physical.x,y:physical.y},...physical.remaining],started_at:time+2000};
 assert.deepEqual(tracker.sample(snapshot,layout,time+2000,true),before);
 assert.deepEqual(tracker.sample(snapshot,layout,time+3000,true),visualMotion(worker,layout,time+3000));
 const paused=tracker.sample({...snapshot,state:'STOPPED'},layout,time+100000,false);assert.equal(paused.moving,false);assert.equal(paused.x,visualMotion(worker,layout,time+3000).x);
});
