import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverMarket,discoveryLinks,DISCOVERY_SEEDS} from '../market-discovery.mjs';
import {buildWebsite,websiteQA} from '../website-line.mjs';
const listing=url=>`<form data-product_variations="[{&quot;attributes&quot;:{&quot;attribute_pa_license&quot;:&quot;standard&quot;},&quot;display_price&quot;:39,&quot;is_in_stock&quot;:true,&quot;is_purchasable&quot;:true}]"></form><script type="application/ld+json">${JSON.stringify({'@type':'Product',url,name:'Premium Resort Website Template',offers:[{price:39,priceCurrency:'USD'}]})}</script><span>100</span><span>Purchases</span>`;
test('discovery follows index pagination, rejects free listings, persists its outbox and resumes',async()=>{
 const url='https://themewagon.com/themes/new-resort/',page=DISCOVERY_SEEDS[0],next=page+'page/2/';let saved;
 const read=async u=>u.endsWith('robots.txt')?'User-agent: *':u===page?`<a href="${url}">New premium resort</a><a href="https://themewagon.com/themes/free-kit/">Free template</a><a class="next page-numbers" href="${next}">Next</a>`:u===url?listing(url):u.includes('ecb.europa.eu')?`<Cube time='${new Date().toISOString().slice(0,10)}'><Cube currency='USD' rate='1.1'/></Cube>`:Promise.reject(Error('unexpected '+u));
 const result=await discoverMarket(read,{state:{pages:[page]},save:s=>saved=s,pageLimit:1,listingLimit:1});
 assert.equal(result.opportunities[0].deliverable,'hospitality-kit-v1');assert.deepEqual(saved.pages,[next]);assert.equal(saved.pending.length,0);assert.equal(saved.outbox.length,1);assert.ok(result.checks.some(c=>c.reason?.includes('Free')));
 const resumed=await discoverMarket(read,{state:saved,pageLimit:0,listingLimit:0});assert.equal(resumed.opportunities.length,1,'crash before import retains output');
 const kit=buildWebsite(result.opportunities[0]);assert.ok(websiteQA(kit,result.opportunities[0]).passed);assert.match(kit.html,/Rooms and occupancy/);
});
test('discovery excludes foreign URLs, retains interrupted work and caps failed retries',async()=>{
 assert.deepEqual(discoveryLinks('<a href="http://127.0.0.1/themes/a/">Premium resort</a><a href="https://themewagon.com.evil.test/themes/b/">Premium</a>',DISCOVERY_SEEDS[0]).listings,[]);
 const row={url:'https://themewagon.com/themes/broken/',title:'Premium',source:DISCOVERY_SEEDS[0]};let saved={pages:[],pending:[row]};
 for(let i=0;i<3;i++)await discoverMarket(async u=>u.endsWith('robots.txt')?'':Promise.reject(Error('offline')),{state:saved,pageLimit:0,listingLimit:1,save:s=>saved=s});
 assert.equal(saved.pending.length,0);assert.equal(saved.listingsChecked,3);
 const c=new AbortController();c.abort();await assert.rejects(discoverMarket(async()=>'',{signal:c.signal,state:{pages:[DISCOVERY_SEEDS[0]]}}));
});

test('idle discovery does not push the daily revisit deadline forward forever',async()=>{
 const now=Date.now(),revisitAt=now+5000;let saved;
 await discoverMarket(async()=>'',{state:{pages:[],pending:[],revisitAt},now,save:s=>saved=s});assert.equal(saved.revisitAt,revisitAt);
 await discoverMarket(async()=>'',{state:saved,now:now+6000,pageLimit:0,save:s=>saved=s});assert.ok(saved.pages.length>0);assert.equal(saved.revisitAt,null);
});
