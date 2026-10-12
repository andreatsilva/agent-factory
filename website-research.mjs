import {collectRestaurantResearch,parseRestaurantMarket,parseEcb,ECB_SOURCE} from './restaurant-research.mjs';
import {robotsAllows} from './research.mjs';
export const BUSINESS_CATEGORY='https://themewagon.com/theme-tag/business-corporate/';
export const WEBSITE_MARKETS=[
 {id:'agency',url:'https://themewagon.com/themes/reign-pro/',match:/agency/i,title:'Signalroom — Agency Website Kit',niche:'Creative agency',deliverable:'agency-kit-v1'},
 {id:'interior',url:'https://themewagon.com/themes/freya/',match:/interior design/i,title:'Quietspace — Interior Studio Website Kit',niche:'Interior design studio',deliverable:'interior-kit-v1'},
 {id:'business',url:'https://themewagon.com/themes/boots5/',match:/business/i,title:'Clearpath — Business Website Kit',niche:'Independent business services',deliverable:'business-kit-v1'},
];

// Bounded provider registry. Never follow arbitrary URLs from source HTML.
// Fetch failures are recorded per line; another healthy line can still produce.
export async function collectWebsiteResearch(getText,{signal}={}){
 const cache=new Map(),opportunities=[],checks=[];
 const read=url=>{signal?.throwIfAborted();if(!cache.has(url))cache.set(url,Promise.resolve().then(()=>getText(url)));return cache.get(url);};
 const line=async(id,fn)=>{try{const rows=await fn();signal?.throwIfAborted();opportunities.push(...rows);checks.push({id,status:'COMPLETE',candidates:rows.length});}catch(e){signal?.throwIfAborted();checks.push({id,status:'FAILED',error:e.message});}};
 await line('restaurant',()=>collectRestaurantResearch(read));
 for(const market of WEBSITE_MARKETS)await line(market.id,async()=>{
  const robots=await read('https://themewagon.com/robots.txt');
  for(const url of [market.url,BUSINESS_CATEGORY])if(!robotsAllows(robots,new URL(url).pathname))throw Error('Public source disallows research access');
  const category=await read(BUSINESS_CATEGORY);
  if(!/Business\s*(?:&amp;|&)\s*Corporate/i.test(category)||!category.includes('Premium')||!category.includes('Free'))throw Error('Business category evidence unavailable');
  const observed=parseRestaurantMarket(await read(market.url),new Date().toISOString(),market.url);
  if(!market.match.test(observed.price.title))throw Error('Source no longer matches the supported niche');
  const exchangeRates=parseEcb(await read(ECB_SOURCE)),hasSales=observed.purchases>=10;
  return [{title:market.title,niche:market.niche,deliverable:market.deliverable,productType:'website',observedDemand:hasSales?78:35,confidence:hasSales?65:35,competition:65,platformRisk:10,priceEvidence:[observed.price],exchangeRates,evidence:[
   {url:market.url,observation:`Public single-project asking price: ${observed.price.amount} USD. Seller-reported purchases: ${observed.purchases??'unavailable'}; unaudited, not verified revenue or a forecast.`},
   {url:BUSINESS_CATEGORY,observation:'Business website category includes paid and free competitors. Same marketplace, not independent demand validation. Category evidence does not establish sales for our kit.'}
  ],reasoning:'Original '+market.niche+' static website kit with niche-specific sections and an editable planning worksheet. Comparator is a broader template bundle with different features and support; price comparison does not promise equivalence. No competitor files, images or prose reused.'}];
 });
 return {opportunities,checks};
}
