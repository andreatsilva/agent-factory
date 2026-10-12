import {test} from 'node:test';
import assert from 'node:assert/strict';
import {framesForGrid,extractPalette} from '../product-tools.mjs';
import {parseMarketplace,robotsAllows,evaluateMarket,manufacturingBrief} from '../research.mjs';
import {buildProduct,qualityCheck} from '../manufacturing.mjs';
import {inspectZip,crc32} from '../zip.mjs';
import {marketFixture} from './providers.mjs';
test('public source parser requires prices, robots restrictions apply, discussion is not sales evidence',()=>{
 const rows=parseMarketplace(marketFixture);assert.equal(rows.length,3);assert.equal(rows[0].price,19.99);assert.equal(evaluateMarket(rows).candidate.decision,'approved');
 assert.equal(evaluateMarket([{title:'Pixel tool',digital:true,source_type:'discussion',points:100000,url:'https://example.org'}]).candidate.decision,'needs_evidence');
 assert.equal(robotsAllows('User-agent: *\nDisallow: /tools','/tools/top-sellers'),false);assert.equal(robotsAllows('User-agent: *\nDisallow: /search','/tools/top-sellers'),true);
});
test('frame math handles spacing, partial edges, invalid dimensions and resource limits',()=>{
 assert.deepEqual(framesForGrid(64,32,32,32),[{name:'frame_0000',x:0,y:0,width:32,height:32},{name:'frame_0001',x:32,y:0,width:32,height:32}]);
 assert.equal(framesForGrid(71,39,32,32,2,2).length,2);assert.equal(framesForGrid(71,39,32,32,2,2)[1].x,36);
 for(const args of [[32,32,0,32],[32,32,64,64],[32,32,2.5,32],[9000,9000,1,1]])assert.throws(()=>framesForGrid(...args));
});
test('palette ignores transparent pixels and ranks colors by frequency',()=>{
 const p=extractPalette(new Uint8ClampedArray([255,0,0,255,0,255,0,255,255,0,0,100,0,0,255,0]));assert.deepEqual(p,[{color:'#ff0000',pixels:2},{color:'#00ff00',pixels:1}]);
});
test('original product contains real utilities, valid ZIP, checked script and escaped guide text',()=>{
 const brief=manufacturingBrief(evaluateMarket(parseMarketplace(marketFixture)).candidate),product=buildProduct(brief);
 assert.equal(qualityCheck(brief,product).passed,true);const entries=inspectZip(product.zip);assert.equal(entries.length,7);assert.equal(entries.find(f=>f.name==='workbench.html').data.toString(),product.html);
 assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);const corrupt=Buffer.from(product.zip);corrupt[100]^=1;assert.throws(()=>inspectZip(corrupt));
 const escaped=buildProduct(brief,{steps:['<img src=x onerror=alert(1)>']});assert.ok(!escaped.html.includes('<img src=x'));assert.ok(escaped.html.includes('&lt;img'));
 product.files['asset-register.csv']='';assert.equal(qualityCheck(brief,product).passed,false);
});
