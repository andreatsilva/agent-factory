import {parseRestaurantMarket,parseEcb,ECB_SOURCE} from './restaurant-research.mjs';
import {robotsAllows} from './research.mjs';

export const DISCOVERY_SEEDS=['https://themewagon.com/theme-category/landing-website/','https://themewagon.com/theme-tag/business-corporate/','https://themewagon.com/theme-tag/restaurant-template/'];
const text=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#(?:8211|8212);/g,'–').replace(/\s+/g,' ').trim();
export function discoveryLinks(html,base){
 const listings=new Map(),pages=new Set();
 for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
  const href=m[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];if(!href)continue;
  let u;try{u=new URL(href,base);}catch{continue;}
  if(u.origin!=='https://themewagon.com'||u.search||u.hash||u.username||u.password)continue;
  if(/^\/themes\/[a-z0-9-]+\/$/.test(u.pathname)){const title=text(m[2]);if(title.length>5&&!listings.has(u.href))listings.set(u.href,{url:u.href,title,source:base});}
  if(/\bnext\b/.test(m[1])&&DISCOVERY_SEEDS.some(seed=>u.href.startsWith(seed)&&/^page\/[1-9]\d{0,2}\/$/.test(u.href.slice(seed.length))))pages.add(u.href);
 }
 return {listings:[...listings.values()],pages:[...pages]};
}
// Product URLs come from indexes. Capabilities remain explicit: unrelated software
// and differently branded copies of an existing niche are not new products.
function classify(title){
 if(/dashboard|admin|bundle|builder|wordpress|react|vue|angular/i.test(title))return null;
 if(/hotel|resort|lodging/i.test(title))return {title:'Stillwater — Guest Stay Website Kit',niche:'Independent guest accommodation',deliverable:'hospitality-kit-v1'};
 if(/restaurant/i.test(title))return {title:'Tablelight — Restaurant Website Kit',niche:'Independent restaurant',deliverable:'restaurant-kit-v2'};
 if(/interior/i.test(title))return {title:'Quietspace — Interior Studio Website Kit',niche:'Interior design studio',deliverable:'interior-kit-v1'};
 if(/agency/i.test(title))return {title:'Signalroom — Agency Website Kit',niche:'Creative agency',deliverable:'agency-kit-v1'};
 if(/business|corporate/i.test(title))return {title:'Clearpath — Business Website Kit',niche:'Independent business services',deliverable:'business-kit-v1'};
 return null;
}
export async function discoverMarket(getText,{signal,state={},save=()=>{},now=Date.now(),pageLimit=2,listingLimit=4}={}){
 const s=structuredClone(state),checks=[],opportunities=[];
 s.pages??=[...DISCOVERY_SEEDS];s.pending??=[];s.seen??={};s.outbox??=[];s.pagesScanned??=0;s.listingsChecked??=0;
 if(!s.pages.length&&!s.pending.length&&now>=(s.revisitAt||0)){s.pages=[...DISCOVERY_SEEDS];s.seen={};s.revisitAt=null;}
 const persist=()=>save(structuredClone(s));
 const read=async url=>{signal?.throwIfAborted();const body=await getText(url);signal?.throwIfAborted();return body;};
 const robots=await read('https://themewagon.com/robots.txt');
 const allowed=url=>robotsAllows(robots,new URL(url).pathname);
 let rates;
 const pagesThisRun=Math.min(pageLimit,s.pages.length);
 for(let i=0;i<pagesThisRun&&s.pages.length;i++){
  const url=s.pages[0];try{
   if(!allowed(url))throw Error('Robots policy excludes index');
   const found=discoveryLinks(await read(url),url);
   if(!found.listings.length)throw Error('No listing links found; index markup may have changed');
   for(const row of found.listings){if(s.seen[row.url])continue;s.seen[row.url]=true;
    if(/\bfree\b/i.test(row.title)&&!/\bpremium\b/i.test(row.title))checks.push({id:row.url,status:'REJECTED',reason:'Free listing; no paid comparator'});
    else s.pending.push(row);
   }
   s.pages.shift();for(const page of found.pages)if(!s.pages.includes(page))s.pages.push(page);
   s.pagesScanned++;checks.push({id:url,status:'COMPLETE',candidates:found.listings.length});
  }catch(e){signal?.throwIfAborted();checks.push({id:url,status:'FAILED',error:e.message});s.pages.push(s.pages.shift());}
  persist();
 }
 const listingsThisRun=Math.min(listingLimit,s.pending.length);
 for(let i=0;i<listingsThisRun&&s.pending.length;i++){
  const row=s.pending[0];try{
   if(!allowed(row.url))throw Error('Robots policy excludes listing');
   const market=parseRestaurantMarket(await read(row.url),new Date(now).toISOString(),row.url),profile=classify(market.price.title);
   if(!profile){checks.push({id:row.url,status:'REJECTED',reason:'No supported original website kit for this niche or technology'});}
   else if(!(market.purchases>=10)){checks.push({id:row.url,status:'REJECTED',reason:'Fewer than 10 seller-reported purchases or count unavailable'});}
   else{
    rates??=parseEcb(await read(ECB_SOURCE));
    opportunities.push({...profile,productType:'website',observedDemand:78,confidence:65,competition:65,platformRisk:10,priceEvidence:[market.price],exchangeRates:rates,evidence:[{url:row.url,observation:`Public single-project asking price: ${market.price.amount} USD; seller-reported purchases: ${market.purchases}. Unaudited; not a forecast.`},{url:row.source,observation:'Discovered through public marketplace index. Same marketplace, not independent demand validation.'}],reasoning:'Original editable static kit. Source features and support differ; no competitor code or prose reused.'});
    checks.push({id:row.url,status:'COMPLETE',candidates:1});
   }
   if(opportunities.length){s.outbox.push(...opportunities.splice(0));}
   s.pending.shift();
  }catch(e){signal?.throwIfAborted();row.attempts=(row.attempts||0)+1;checks.push({id:row.url,status:'FAILED',error:e.message});s.pending.shift();if(row.attempts<3)s.pending.push(row);}
  s.listingsChecked++;persist();
 }
 if(!s.pages.length&&!s.pending.length&&!s.revisitAt)s.revisitAt=now+86400000;
 s.lastRunAt=new Date(now).toISOString();s.lastChecks=checks.slice(-30);persist();
 return {opportunities:s.outbox,checks,discovery:{pagesScanned:s.pagesScanned,listingsChecked:s.listingsChecked,pendingListings:s.pending.length,pendingPages:s.pages.length,nextPage:s.pages[0]||null,revisitAt:s.revisitAt||null,lastRunAt:s.lastRunAt}};
}
