import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {APP_PROFILES,WEBSITE_STYLES,websiteDirection,validateResearchSpec,sourceIdentity,independentStudioBrief,assertWebsiteSourceScope} from '../product-strategy.mjs';
import {buildStudioProduct} from '../studio-products.mjs';
import {buildWebsite,websiteQA} from '../website-line.mjs';
import {validateBrief} from '../product-planner.mjs';
import {createResearchProduction} from '../research-production.mjs';
import {readProductSources} from '../product-sources.mjs';
import {inspectZip} from '../zip.mjs';
const brief={brand:'Fieldwork',headline:'A place for your next idea',description:'An original workspace for planning and organizing personal work.',accent:'#6654c8',items:['Review project details','Prepare the first draft','Review the next step']};
const web=validateBrief({audience:'Independent creative studios',purpose:'Discuss a visual identity',brand:'Fieldwork',headline:'Clarity for your next chapter.',intro:'A considered visual identity begins with understanding the people who use it.',section:'What we make',cards:[['Identity','A visual vocabulary for your studio.'],['Editorial','Thoughtful pages with a clear reading order.'],['Direction','A coherent concept for your next release.']],steps:['Discuss the idea','Explore the direction','Refine the details'],questions:['Who is your audience?','What should change?','When is the work needed?'],sample:'A fictional brief for a small studio.'});
test('website design families have distinct layouts, valid links, archives and structural QA',()=>{
 const documents=new Set();
 for(const designStyle of Object.keys(WEBSITE_STYLES)){
  const o={niche:web.audience,title:web.brand,deliverable:'generated-website-v1',websiteBrief:{...web,designStyle}};
  const built=buildWebsite(o),qa=websiteQA(built,o);assert.equal(qa.passed,true,JSON.stringify(qa.checks.filter(x=>!x.passed)));assert.match(built.html,new RegExp('class="design-'+designStyle+'"'));documents.add(built.html);
  assert.match(built.html,/<div class="hero-art"/);assert.ok(inspectZip(built.zip).some(f=>f.name==='index.html'));
 }assert.equal(documents.size,4);
});
test('app deliverables expose different functional workflows instead of renamed timers',async()=>{
 const htmls=[];
 for(const variant of Object.keys(APP_PROFILES)){
  const out=await buildStudioProduct('app',brief,'variety-'+variant,new AbortController().signal,{variant});
  assert.equal(out.qa.passed,true);assert.match(out.html,/localStorage/);assert.doesNotMatch(out.html,/fetch\(|https:\/\//);
  if(variant==='focus')assert.match(out.html,/25:00/);else{assert.match(out.html,/Export backup/);assert.match(out.html,new RegExp('"variant":"'+variant+'"'));assert.doesNotMatch(out.html,/25:00/);}
  const readme=inspectZip(out.zip).find(f=>f.name==='README.md').data.toString();assert.ok(readme.includes(APP_PROFILES[variant].features[0]));htmls.push(out.html);
 }assert.equal(new Set(htmls).size,5);
 await assert.rejects(buildStudioProduct('app',brief,'unsafe',null,{variant:'unimplemented'}));
});
test('one source cannot create endless renamed website variants and identity ignores tracking URLs',()=>{
 const seed={niche:'Creative agencies',title:'Source product',priceEvidence:[{url:'https://example.org/template?campaign=1',title:'Agency template'}]};
 const first=websiteDirection(seed,[]),old={...seed,websiteBrief:{...web,designStyle:first.variant},researchSpec:first};
 const second=websiteDirection(seed,[old]);assert.notEqual(first.variant,second.variant);
 assert.equal(websiteDirection(seed,[old,{...old,researchSpec:second,websiteBrief:{...web,designStyle:second.variant}}]),null);
 assert.equal(sourceIdentity('website','bento','https://www.example.org/template/?x=2'),sourceIdentity('website','bento',seed.priceEvidence[0].url));
 assert.throws(()=>validateResearchSpec({...first,source:{title:'bad',url:'file:///private'}}));
});
test('live-page discovery preserves product capabilities and refuses a renamed duplicate after restart',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE studio_products(id TEXT PRIMARY KEY,data TEXT,package BLOB)');
 const spec={db,imageAvailable:()=>true,ensureRunning(){},jobStage(){},log(){},research:async(type,niche,{variant})=>({status:'PRODUCT_PAGES_READ',references:[{url:'https://product.example/board',title:'Kanban project board app',observation:'Create task cards and move between stages.',basis:'Public product page read live'}]})};
 const set=()=>db.prepare("INSERT INTO settings VALUES('creative_discovery',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify({sequence:2,nextAt:0}));
 try{set();let queue=createResearchProduction(spec);await queue.discover({controller:new AbortController()});const row=queue.pending()[0];assert.equal(row.researchSpec.variant,'kanban');assert.match(row.researchSpec.features[1],/Move/);queue.finish(row,'COMPLETE');set();queue=createResearchProduction(spec);assert.equal(await queue.discover({controller:new AbortController()}),0);assert.equal(queue.rows().length,1);}finally{db.close();}
});
test('product-page research respects robots, refuses unrelated pages and records partial failure',async()=>{
 const responses=[];
 const request=async url=>{responses.push(String(url));return new Response(String(url).endsWith('robots.txt')?'User-agent: *\nAllow: /':String(url).includes('todoist')?'<title>Kanban board app</title><main>Kanban boards organize tasks into stages.</main>':'<title>Unrelated homepage</title><p>No product capabilities here.</p>');};
 const found=await readProductSources('kanban',{request});assert.equal(found.references.length,1);assert.equal(found.checks[1].status,'UNAVAILABLE');assert.equal(responses.length,4);
 const blocked=await readProductSources('kanban',{request:async()=>new Response('User-agent: *\nDisallow: /')});assert.equal(blocked.references.length,0);
});

 test('production keeps its own identity and refuses source-category drift',()=>{
 const b=independentStudioBrief({...brief,brand:'ReferenceBrand',items:['Sync across devices','Bank integration','Fake feature']},{type:'app',variant:'notes'},'ST-test');
 assert.match(b.brand,/^NEO Notes/);assert.deepEqual(b.items,APP_PROFILES.notes.features);assert.doesNotMatch(b.description,/sync|bank/i);
 assert.throws(()=>assertWebsiteSourceScope({...web,intro:'We help restaurant owners improve procurement.'},{niche:'Independent restaurant'}));
 assert.doesNotThrow(()=>assertWebsiteSourceScope({...web,intro:'Explore our menu and book a table by email.'},{niche:'Independent restaurant'}));
 });
