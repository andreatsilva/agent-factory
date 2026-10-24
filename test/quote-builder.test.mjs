import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {normalizeQuote,quoteTotals,readQuoteBackup,quoteDocument} from '../quote-builder.mjs';
import {readProductSources} from '../product-sources.mjs';
import {relevantResearchReferences} from '../creative-research.mjs';
import {createPublicProducts} from '../public-products.mjs';
const quote=()=>({number:'Q-003',seller:'My studio',client:'Client',date:'2026-10-24',validUntil:'',currency:'EUR',discount:10,tax:23,notes:'Scope agreed separately',items:[{description:'Design',quantity:2,rate:45.5},{description:'Review',quantity:1.5,rate:20}]});
test('quote calculations round each line and apply discount before manual tax',()=>{
 assert.deepEqual(quoteTotals(quote()),{lines:[9100,3000],subtotal:12100,discount:1210,tax:2505,total:13395});
 const q=quote();q.items=[{description:'Small unit',quantity:.1,rate:.2}];q.discount=0;q.tax=0;assert.equal(quoteTotals(q).total,2);
 q.discount=100;q.tax=100;assert.equal(quoteTotals(q).total,0);
 q.items=Array.from({length:50},()=>({description:'Bound',quantity:10000,rate:1000000}));assert.ok(Number.isSafeInteger(quoteTotals(q).total));
});
test('quote backups validate atomically, strip extra fields and reject malformed or oversized inputs',()=>{
 const original=quote(),backup=JSON.stringify({app:'quote',version:1,quote:{...original,unexpected:'discard'}});
 assert.deepEqual(readQuoteBackup(backup),original);
 for(const value of [null,{}, {...original,items:[]},{...original,date:'2026-02-30'},{...original,currency:'ZZZ'},{...original,tax:101},{...original,discount:-1},{...original,items:[{description:'bad',quantity:1.123,rate:20}]},{...original,items:[{description:'bad',quantity:1,rate:Infinity}]}])assert.throws(()=>normalizeQuote(value));
 for(const text of ['not JSON',JSON.stringify({app:'notes',version:1,quote:original}),JSON.stringify({app:'quote',version:2,quote:original}),' '.repeat(100001)])assert.throws(()=>readQuoteBackup(text));
 assert.deepEqual(quote(),original);
});
test('standalone quote document bundles valid functions without external requests or unescaped generated copy',()=>{
 const html=quoteDocument({brand:'<script>bad</script>'},'test</script>');
 assert.match(html,/&lt;script&gt;bad/);assert.doesNotMatch(html,/<script>bad|fetch\(|https:\/\//);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);assert.doesNotThrow(()=>new Script(scripts[0][1]));
 assert.match(html,/@media print/);assert.match(html,/Restore backup/);assert.match(html,/Saved drafts/);
});
test('quote research reads a primary product page and catalog keeps its bounded format',async()=>{
 const result=await readProductSources('quote',{request:async url=>new Response(url.endsWith('robots.txt')?'User-agent: *\nAllow: /':'<title>Quotes | Product documentation</title><main>A quote is a priced proposal. Line items include quantity and unit price.</main>')});
 assert.equal(relevantResearchReferences('app',result.references,'quote').length,1);
 const catalog=createPublicProducts({mode:'LIVE',products:[{id:'ST-quote',title:'Offline quote builder',type:'app',variant:'quote',priceCents:null,pricingStatus:'RESEARCH_PENDING'}]},Date.now(),{freeDownloads:true});
 assert.equal(catalog.products[0].variant,'quote');assert.equal(catalog.products[0].downloadAvailable,true);
});

