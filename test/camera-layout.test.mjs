import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screenToWorld,worldToScreen,zoomAt,fitCamera} from '../camera.mjs';
import {CORE,SIDES,emptyLayout,changeLayout,bayRooms,layoutBounds} from '../layout.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('zoom preserves the world point under the cursor and hit testing round trips',()=>{
 const bounds={x:-1000,y:-1000,w:4000,h:3000};
 for(const [w,h] of [[1280,720],[390,450],[1920,800]])for(const zoom of [.2,1,2,4]){const c={x:600,y:300,zoom},p={x:w*.6,y:h*.4},before=screenToWorld(p,c,w,h),after=screenToWorld(p,zoomAt(c,p,1.3,bounds,w,h),w,h);near(before.x,after.x);near(before.y,after.y);const screen=worldToScreen(before,c,w,h);near(screen.x,p.x);near(screen.y,p.y);}
});
test('expansion preserves the original footprint, prevents overlap and fits all bays',()=>{
 let layout=emptyLayout();for(const side of SIDES)for(let i=0;i<8;i++)layout=changeLayout(layout,{action:'add',side,type:'workshop',revision:layout.revision});
 const rooms=[CORE,...bayRooms(layout)];
 for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++){const a=rooms[i],b=rooms[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Rooms must not overlap');}
 const bounds=layoutBounds(layout);for(const [w,h] of [[1280,720],[390,450]]){const camera=fitCamera(bounds,w,h);for(const r of rooms){const tl=worldToScreen(r,camera,w,h),br=worldToScreen({x:r.x+r.w,y:r.y+r.h},camera,w,h);assert.ok(tl.x>=0&&tl.y>=0&&br.x<=w&&br.y<=h);}}
 assert.throws(()=>changeLayout(layout,{action:'add',side:'north',type:'storage',revision:layout.revision}),/full/);
 assert.throws(()=>changeLayout(layout,{action:'remove',id:'bay-east-0',revision:layout.revision}),/outermost/);
});
test('layout rejects stale edits and unsupported geometry rather than losing saved bays',()=>{
 const layout=changeLayout(emptyLayout(),{action:'add',side:'east',type:'servers',revision:0});
 assert.throws(()=>changeLayout(layout,{action:'add',side:'west',type:'storage',revision:0}),/another window/);
 assert.throws(()=>changeLayout(layout,{action:'add',side:'oops',type:'storage',revision:1}),/valid/);
 assert.throws(()=>changeLayout(layout,{action:'add',side:'west',type:'fake',revision:1}),/valid/);
 assert.equal(changeLayout(layout,{action:'remove',id:'bay-east-0',revision:1}).bays.length,0);
 assert.equal(layout.bays.length,1,'Input state is immutable');
});
