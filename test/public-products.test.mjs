import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitizePublicProducts,createPublicProducts} from '../public-products.mjs';
import {createViewerServer} from '../viewer-server.mjs';
import {readPublicProducts} from '../viewer-client.mjs';
const fixture=()=>({version:1,mode:'LIVE',generatedAt:Date.now(),total:1,products:[{id:'BP-test-LIVE',title:'Editable kit',niche:'Creative studio',description:'Original code',priceCents:2700,discount:.1,files:6,createdAt:'2026-10-15T12:00:00Z',features:['Service cards'],package:'SECRET',pagePath:'/operator',externalUrl:'https://secret.example',brief:'PRIVATE',client:{email:'PRIVATE'}}],token:'SECRET'});
test('public products use an explicit bounded schema and reject demo data',()=>{
 const data=sanitizePublicProducts(fixture()),json=JSON.stringify(data);
 for(const word of ['SECRET','PRIVATE','package','pagePath','externalUrl','client','brief','token'])assert.ok(!json.includes(word),word);
 assert.equal(data.products[0].priceCents,2700);assert.deepEqual(data.products[0].features,['Service cards']);
 assert.throws(()=>sanitizePublicProducts({...fixture(),mode:'DEMO'}));assert.throws(()=>createPublicProducts({mode:'DEMO'}));
 const good=fixture().products[0];const malicious={...fixture(),products:[good,good,{...good,id:'../../data'},{...good,id:'bad',priceCents:-1},null]};assert.equal(sanitizePublicProducts(malicious).products.length,1);
 const huge={...fixture(),products:Array.from({length:1100},(_,i)=>({...good,id:'p'+i,title:'x'.repeat(300),features:Array(25).fill('x'.repeat(1000))}))};
 const bounded=sanitizePublicProducts(huge);assert.equal(bounded.products.length,1000);assert.equal(bounded.products[0].title.length,160);assert.equal(bounded.products[0].features.length,12);assert.equal(bounded.products[0].features[0].length,220);
});
test('catalog proxy uses a fixed read-only path, drops private fields and coalesces requests',async()=>{
 let calls=0,time=Date.now(),online=true;
 const server=createViewerServer({now:()=>time,request:async(url,opts)=>{calls++;assert.equal(url.href,'http://127.0.0.1:8787/api/public/products');assert.equal(opts.headers,undefined);assert.equal(opts.redirect,'error');if(!online)throw Error('SECRET');return new Response(JSON.stringify({...fixture(),generatedAt:time}));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const path of ['/products?mode=DEMO','/products?id=x','/api/business/package','/products/../data/factory.sqlite','/products/anything'])assert.equal((await fetch(base+path)).status,404);
  for(const method of ['POST','PATCH','DELETE'])assert.equal((await fetch(base+'/products',{method,body:'{}'})).status,405);
  assert.equal((await fetch(base+'/products',{headers:{Origin:'https://evil.example'}})).status,403);assert.equal(calls,0);
  const pre=await fetch(base+'/products',{method:'OPTIONS',headers:{Origin:'https://andreatsilva.github.io','Access-Control-Request-Method':'GET'}});assert.equal(pre.status,204);
  const results=await Promise.all(Array.from({length:8},()=>fetch(base+'/products',{headers:{Origin:'https://andreatsilva.github.io',Authorization:'SECRET'}})));
  assert.equal(calls,1);for(const r of results){assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'https://andreatsilva.github.io');assert.ok(!(await r.text()).includes('SECRET'));}
  time+=11000;online=false;const failed=await fetch(base+'/products');assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('SECRET'));
 }finally{await new Promise(r=>server.close(r));}
});
test('catalog client uses credential-free bounded reads and rejects stale data',async()=>{
 const data=await readPublicProducts('https://feed.example/snapshot',async(url,opts)=>{assert.equal(url,'https://feed.example/products');assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');return new Response(JSON.stringify(fixture()));});assert.equal(data.products.length,1);
 await assert.rejects(readPublicProducts('https://feed.example/snapshot',async()=>new Response(JSON.stringify({...fixture(),generatedAt:Date.now()-60000}))),/stale/);
 await assert.rejects(readPublicProducts(''),/not configured/);
});

test('temporary free mode preserves original prices and can restore priced catalog output',()=>{
 const catalog={mode:'LIVE',total:1,products:fixture().products};
 const free=createPublicProducts(catalog,Date.now(),{freeDownloads:true});
 assert.equal(free.products[0].priceCents,0);assert.equal(free.products[0].downloadAvailable,true);assert.equal(free.products[0].pricingStatus,'FREE');
 assert.equal(catalog.products[0].priceCents,2700);
 const priced=createPublicProducts(catalog,Date.now(),{freeDownloads:false});assert.equal(priced.products[0].priceCents,2700);assert.equal(priced.products[0].downloadAvailable,false);
});
