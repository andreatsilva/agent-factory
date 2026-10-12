import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePrices,priceFromMarket,productPriceCents} from '../market-pricing.mjs';
import {parseRestaurantMarket,parseEcb,RESTAURANT_SOURCE,RESTAURANT_CATEGORY,ECB_SOURCE,collectRestaurantResearch} from '../restaurant-research.mjs';
import {DEFAULT_BUSINESS_CONFIG as config,normalizeOpportunity,scoreOpportunity} from '../business-rules.mjs';
import {buildWebsite,websiteQA} from '../website-line.mjs';
import {robotsAllows} from '../research.mjs';
const now=Date.parse('2026-10-04T12:00:00Z'),price=(amount=29,currency='USD',url=RESTAURANT_SOURCE)=>({url,title:'Test restaurant listing',amount,currency,license:'Single project',observedAt:'2026-10-04T10:00:00Z'}),fx={date:'2026-10-02',source:'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',rates:{USD:1.1225}};
test('research respects wildcard and end-anchored robots paths without blocking unrelated product pages',()=>{
 const rules='User-agent: *\nDisallow: */feed/\nDisallow: */embed/\nDisallow: /private/\nAllow: /private/public/\nDisallow: /end$';
 assert.equal(robotsAllows(rules,'/themes/restaurant/'),true);assert.equal(robotsAllows(rules,'/themes/restaurant/feed/'),false);assert.equal(robotsAllows(rules,'/private/secret'),false);assert.equal(robotsAllows(rules,'/private/public/item'),true);assert.equal(robotsAllows(rules,'/end'),false);assert.equal(robotsAllows(rules,'/ending'),true);
});
test('pricing discounts observed offers with explicit FX, excludes stale data and respects margin floor',()=>{
 const o={priceEvidence:normalizePrices([price()]),exchangeRates:fx,estimatedProductionCost:.1};
 assert.equal(priceFromMarket(o,config,now).priceCents,2325);assert.equal(priceFromMarket({...o,priceEvidence:[price(40,'EUR'),price(30,'EUR','https://example.com/second')]},config,now).priceCents,2700);
 assert.equal(priceFromMarket({...o,exchangeRates:null},config,now).status,'NEEDS_PRICE_EVIDENCE');assert.equal(priceFromMarket({...o,exchangeRates:{...fx,date:'2026-09-01'}},config,now).status,'NEEDS_PRICE_EVIDENCE');
 assert.equal(priceFromMarket({...o,priceEvidence:[{...price(),observedAt:'2026-09-01'}]},config,now).status,'NEEDS_PRICE_EVIDENCE');assert.equal(priceFromMarket({...o,estimatedProductionCost:20},config,now).status,'BELOW_COST_FLOOR');
 assert.throws(()=>normalizePrices([price(-1)]));assert.throws(()=>normalizePrices([{...price(),currency:'XYZ'}]));assert.throws(()=>normalizePrices([{...price(),url:'javascript:alert(1)'}]));assert.equal(productPriceCents({}),2000);
});
test('restaurant adapter requires the single-project price to agree with structured currency and parses seller counts',async()=>{
 const variants=JSON.stringify([{attributes:{attribute_pa_license:'extended'},display_price:290,is_in_stock:true,is_purchasable:true},{attributes:{attribute_pa_license:'standard'},display_price:29,is_in_stock:true,is_purchasable:true}]).replaceAll('"','&quot;');
 const html=`<form data-product_variations="${variants}"></form><script type="application/ld+json">${JSON.stringify([{'@type':'Product',url:RESTAURANT_SOURCE,name:'Reference',offers:[{price:'29',priceCurrency:'USD'}]}])}</script><span>75</span><span>Purchases</span>`;
 assert.equal(parseRestaurantMarket(html).price.amount,29);assert.equal(parseRestaurantMarket(html).purchases,75);assert.throws(()=>parseRestaurantMarket(html.replace('"price":"29"','"price":"39"')));assert.throws(()=>parseRestaurantMarket('<html>access unavailable</html>'));
 assert.deepEqual(parseEcb("<Cube time='2026-10-02'><Cube currency='USD' rate='1.1225'/></Cube>"),fx);
 const source=new Map([[RESTAURANT_SOURCE,html],[RESTAURANT_CATEGORY,'<meta property="og:title" content="Restaurant Template Archives"> Free Premium'],[ECB_SOURCE,"<Cube time='2026-10-02'><Cube currency='USD' rate='1.1225'/></Cube>"],['https://themewagon.com/robots.txt','User-agent: *\nDisallow: */feed/']]);
 const rows=await collectRestaurantResearch(async url=>source.get(url));assert.equal(rows.length,1);assert.equal(rows[0].priceEvidence[0].amount,29);assert.equal(rows[0].evidence.length,2);
 source.set(RESTAURANT_SOURCE,'Access unavailable');await assert.rejects(()=>collectRestaurantResearch(async url=>source.get(url)));
});
test('original restaurant kit has eight matching files, printable menu and QA rejects archive/content divergence',()=>{
 const o=normalizeOpportunity({title:'Tablelight',niche:'Restaurant',deliverable:'restaurant-kit-v2',priceEvidence:[{...price(30,'EUR'),observedAt:new Date().toISOString()}]},'LIVE'),built=buildWebsite(o);
 assert.equal(Object.keys(built.files).length,8);assert.equal(websiteQA(built,o).passed,true);assert.match(built.files['menu.html'],/Roasted tomato/);assert.match(built.files['CUSTOMIZE.md'],/does not automatically update/);
 built.files['index.html']+='tampered';assert.equal(websiteQA(built,o).passed,false);
 assert.equal(scoreOpportunity({...o,priceEvidence:[]}).approved,false);
});
