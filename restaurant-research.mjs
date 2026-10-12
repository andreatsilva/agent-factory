import {robotsAllows} from './research.mjs';
export const RESTAURANT_SOURCE='https://themewagon.com/themes/restaurant/';
export const RESTAURANT_CATEGORY='https://themewagon.com/theme-tag/restaurant-template/';
export const ECB_SOURCE='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
export function parseRestaurantMarket(html,observedAt=new Date().toISOString(),source=RESTAURANT_SOURCE){
 const raw=html.match(/data-product_variations="([^"]+)"/)?.[1];if(!raw)throw Error('Standard license price unavailable; source markup needs review');
 const standard=JSON.parse(decode(raw)).find(v=>v.attributes?.attribute_pa_license==='standard'&&v.is_in_stock&&v.is_purchasable);
 const schemas=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{try{return [JSON.parse(m[1])].flat();}catch{return [];}});
 const product=schemas.find(s=>s['@type']==='Product'&&s.url===source),offer=[product?.offers].flat().find(v=>Number(v?.price)===standard?.display_price&&v?.priceCurrency==='USD');
 if(!standard||!offer)throw Error('Visible standard price and structured USD offer do not agree');
 const purchases=Number(html.match(/<span[^>]*>\s*([\d,]+)\s*<\/span>\s*<span[^>]*>Purchases<\/span>/)?.[1]?.replace(/,/g,''));
 return {price:{url:source,title:product.name,amount:standard.display_price,currency:'USD',license:'Standard / Single Project',observedAt},purchases:Number.isFinite(purchases)?purchases:null};
}
export function parseEcb(xml){const date=xml.match(/time=['"]([\d-]+)['"]/)?.[1],rates=Object.fromEntries([...xml.matchAll(/currency=['"]([A-Z]+)['"]\s+rate=['"]([\d.]+)['"]/g)].map(m=>[m[1],Number(m[2])]));if(!date||!rates.USD)throw Error('ECB rates unavailable');return {source:ECB_SOURCE,date,rates};}
export async function collectRestaurantResearch(getText){
 const robots=await getText('https://themewagon.com/robots.txt');for(const url of [RESTAURANT_SOURCE,RESTAURANT_CATEGORY])if(!robotsAllows(robots,new URL(url).pathname))throw Error('Public source disallows research access');
 const html=await getText(RESTAURANT_SOURCE),market=parseRestaurantMarket(html),category=await getText(RESTAURANT_CATEGORY),exchangeRates=parseEcb(await getText(ECB_SOURCE));
 if(!/content="Restaurant Template Archives"/i.test(category)||!category.includes('Premium')||!category.includes('Free'))throw Error('Restaurant category evidence unavailable');
 return [{title:'Tablelight — Restaurant Website Kit',niche:'Independent restaurant',deliverable:'restaurant-kit-v2',productType:'website',observedDemand:market.purchases>=10?78:35,confidence:market.purchases>=10?65:35,competition:65,platformRisk:10,priceEvidence:[market.price],exchangeRates,evidence:[{url:RESTAURANT_SOURCE,observation:`Public standard-license asking price: ${market.price.amount} USD. Seller-reported purchase count: ${market.purchases??'unavailable'}; unaudited and not a forecast.`},{url:RESTAURANT_CATEGORY,observation:'Public restaurant-template category includes paid and free alternatives. Same marketplace; not independent sales validation.'}],reasoning:'Build an original portable restaurant kit with menu, hours and contact sections. Compare only the single-project license. No competitor code, design, images or prose is reused; the source includes features/support our static kit does not promise.'}];
}
