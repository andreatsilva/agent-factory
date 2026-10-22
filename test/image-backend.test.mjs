import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createCanvas} from '@napi-rs/canvas';
import {createImageBackend} from '../image-backend.mjs';
import {buildStudioProduct} from '../studio-products.mjs';
import {inspectZip} from '../zip.mjs';
const brief={brand:'Garden Ideas',headline:'Build a greener garden',description:'An illustrated thumbnail concept for garden planning.',accent:'#45bca2',items:['Sunlit cottage garden with wildflowers','Plan your space','Start small']};
const canvas=createCanvas(768,432),ctx=canvas.getContext('2d');ctx.fillStyle='#267452';ctx.fillRect(0,0,768,432);const png=canvas.toBuffer('image/png');
test('diffusion artwork is packaged and used in thumbnail layouts with accurate provenance',async()=>{
 let calls=0;const generateImage=async()=>{calls++;return {png,metadata:{model:'test-fixture',seed:7,width:768,height:432}};};
 for(const kind of ['image','thumbnail']){
  const out=await buildStudioProduct(kind,brief,'image-fixture',new AbortController().signal,{generateImage});
  const files=Object.fromEntries(inspectZip(out.zip).map(f=>[f.name,f.data]));
  assert.deepEqual(files['original-image.png'],png);assert.equal(JSON.parse(files['generation.json']).seed,7);
  assert.match(files['README.md'].toString(),/generated|Generated/);assert.ok(!files['README.md'].toString().includes('no photographs or diffusion'));
  assert.equal(out.preview.readUInt32BE(16),kind==='image'?768:1280);
  assert.equal(out.preview.readUInt32BE(20),kind==='image'?432:720);
  if(kind==='thumbnail')assert.notDeepEqual(files['thumbnail-1.png'],files['thumbnail-2.png']);
 }
 assert.equal(calls,2);
 await assert.rejects(buildStudioProduct('image',brief,'missing',new AbortController().signal),/backend is required/);
});
test('image process stays private, serializes work, and STOP waits for child termination',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'neo-image-'));let child,starts=0;
 try{
  mkdirSync(join(dir,'model'));writeFileSync(join(dir,'model','model_index.json'),'{}');
  writeFileSync(join(dir,'image-runtime.json'),JSON.stringify({status:'INSTALLED',python:process.execPath,modelPath:join(dir,'model'),model:'test-fixture'}));
  const backend=createImageBackend({dataDir:dir,spawnProcess:(executable,args,opts)=>{
   starts++;assert.equal(opts.windowsHide,true);assert.ok(args[0].endsWith('image-worker.py'));assert.equal(opts.env.HF_HUB_OFFLINE,'1');assert.equal(opts.shell,undefined);
   child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>setImmediate(()=>child.emit('close',1));return child;
  }});
  const controller=new AbortController(),pending=backend.generate('A green garden',controller.signal);
  assert.equal(backend.overview().status,'GENERATING');await assert.rejects(backend.generate('Second image'),/already busy/);assert.equal(starts,1);
  controller.abort();await assert.rejects(pending);assert.equal(backend.overview().busy,false);
  const success=backend.generate('A green garden');child.stdout.end(JSON.stringify({png:png.toString('base64'),width:768,height:432,seconds:1}));child.emit('close',0);
  const result=await success;assert.equal(result.metadata.model,'test-fixture');assert.deepEqual(result.png,png);assert.equal(backend.overview().lastError,null);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('uninstalled image backend reports honestly and never falls back to fake generated art',async()=>{
 const backend=createImageBackend({dataDir:'path-that-does-not-exist'});assert.equal(backend.overview().status,'NOT_INSTALLED');
 await assert.rejects(backend.generate('A green garden'),/not installed/);assert.equal(backend.overview().busy,false);
});
