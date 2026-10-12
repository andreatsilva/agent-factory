import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectWebsiteResearch,WEBSITE_MARKETS,BUSINESS_CATEGORY} from '../website-research.mjs';
import {RESTAURANT_SOURCE,RESTAURANT_CATEGORY,ECB_SOURCE} from '../restaurant-research.mjs';
import {normalizeOpportunity,opportunityFingerprint,scoreOpportunity} from '../business-rules.mjs';
import {buildWebsite,websiteQA} from '../website-line.mjs';
import {MarketplaceAdapter} from '../marketplace.mjs';
import {inspectZip} from '../zip.mjs';
function listing(url,name,price=39){const variations=JSON.stringify([{attributes:{attribute_pa_license:'standard'},display_price:price,is_in_stock:true,is_purchasable:true}]).replaceAll('"','&quot;');return `<form data-product_variations="${variations}"></form><script type="application/ld+json">${JSON.stringify({'@type':'Product',url,name,offers:[{price,priceCurrency:'USD'}]})}</script><span>100</span><span>Purchases</span>`;}
function fixtures(){const source=new Map([
 ['https://themewagon.com/robots.txt','User-agent: *\nDisallow: */feed/'],
 [RESTAURANT_SOURCE,listing(RESTAURANT_SOURCE,'Restaurant template',29)],
 [RESTAURANT_CATEGORY,'<meta content="Restaurant Template Archives"> Free Premium'],
 [BUSINESS_CATEGORY,'Business &amp; Corporate · Free · Premium'],
 [ECB_SOURCE,`<Cube time='${new Date().toISOString().slice(0,10)}'><Cube currency='USD' rate='1.1'/></Cube>`],
 ...WEBSITE_MARKETS.map(m=>[m.url,listing(m.url,m.id==='interior'?'Interior Design template':m.id==='agency'?'Agency template':'Business template')])]);return source;}
test('bounded discovery returns four distinct priced niches and shares requests without inventing demand',async()=>{
 const sources=fixtures(),calls=[];
 const result=await collectWebsiteResearch(async url=>{calls.push(url);assert.ok(sources.has(url));return sources.get(url);});
 assert.equal(result.opportunities.length,4);assert.ok(result.checks.every(c=>c.status==='COMPLETE'));assert.equal(calls.length,8);assert.equal(new Set(calls).size,calls.length);
 const normalized=result.opportunities.map(o=>normalizeOpportunity(o,'LIVE','live-adapter'));assert.equal(new Set(normalized.map(opportunityFingerprint)).size,4);
 assert.ok(normalized.every(o=>scoreOpportunity(o).approved));
 sources.set(WEBSITE_MARKETS[0].url,sources.get(WEBSITE_MARKETS[0].url).replace('<span>100</span>','<span>unknown</span>'));
 const missing=(await collectWebsiteResearch(async url=>sources.get(url))).opportunities.find(o=>o.deliverable==='agency-kit-v1');
 assert.equal(scoreOpportunity(normalizeOpportunity(missing,'LIVE')).approved,false,'unavailable seller counts must not become a demand signal');
});
test('source failures, robots exclusions and mismatched identities cannot poison other discovery lines',async()=>{
 const sources=fixtures();sources.set(WEBSITE_MARKETS[1].url,'Access unavailable');
 let r=await collectWebsiteResearch(async url=>sources.get(url));assert.equal(r.opportunities.length,3);assert.equal(r.checks.find(c=>c.id==='interior').status,'FAILED');
 sources.set('https://themewagon.com/robots.txt','User-agent: *\nDisallow: /themes/reign-pro/');
 r=await collectWebsiteResearch(async url=>{assert.notEqual(url,WEBSITE_MARKETS[0].url);return sources.get(url);});assert.equal(r.opportunities.length,2);
 sources.set(WEBSITE_MARKETS[2].url,listing('https://example.com/wrong','Business template'));
 r=await collectWebsiteResearch(async url=>sources.get(url));assert.equal(r.opportunities.length,1);
 const c=new AbortController();c.abort();await assert.rejects(()=>collectWebsiteResearch(async url=>sources.get(url),{signal:c.signal}));
});
test('three niche kits contain different original content, worksheets, matching archives and listing details',()=>{
 const outputs=[];
 for(const m of WEBSITE_MARKETS){const o=normalizeOpportunity({...m,evidence:[],priceEvidence:[]},'LIVE'),built=buildWebsite(o);outputs.push(built.html);
  assert.equal(websiteQA(built,o).passed,true);assert.equal(Object.keys(built.files).length,6);assert.equal(inspectZip(built.zip).length,6);assert.ok(built.files['project-brief.md'].includes(o.niche));
  const listing=new MarketplaceAdapter('LIVE').prepareListing({...o,id:'fixture',files:Object.keys(built.files),priceCents:3100});assert.match(listing.description,/Six editable files/);assert.equal(listing.price,31);
  built.files['project-brief.md']='';assert.equal(websiteQA(built,o).passed,false);
 }
 assert.equal(new Set(outputs).size,3);assert.match(outputs[0],/Brand systems/);assert.match(outputs[1],/Spatial planning/);assert.match(outputs[2],/Implementation support/);
});
