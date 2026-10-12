import {test} from 'node:test';
import assert from 'node:assert/strict';
import {atlasFrames} from '../worker-sprites.mjs';
test('sprite atlas detects padded rows and preserves per-frame boot baselines',()=>{
 const w=640,h=640,data=new Uint8ClampedArray(w*h*4);
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){const top=row*160+16,bottom=top+103+col;for(let y=top;y<bottom;y++)for(let x=col*160+53;x<col*160+97;x++)data[(y*w+x)*4+3]=255;}
 const frames=atlasFrames(data,w,h);assert.equal(frames.length,4);assert.ok(frames.every(r=>r.length===4));for(let r=0;r<4;r++)for(let c=0;c<4;c++){const f=frames[r][c];assert.equal(f.x,c*160+51);assert.equal(f.y,r*160+14);assert.equal(f.h,107+c);assert.equal(f.w,48);}
 assert.throws(()=>atlasFrames(new Uint8ClampedArray(w*h*4),w,h),/four/);
});
