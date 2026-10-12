// Prices are observations, not revenue evidence. Never infer FX or a missing price.
export function normalizePrices(rows=[]){
 if(!Array.isArray(rows)||rows.length>12)throw Error('Supply up to 12 price observations');
 return rows.map(r=>{
  let url;try{url=new URL(r.url);}catch{throw Error('Price observation needs a source URL');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.href.length>500)throw Error('Invalid price source URL');
  if(typeof r.amount!=='number'||!Number.isFinite(r.amount)||r.amount<=0||r.amount>100000)throw Error('Price must be a positive amount');
  if(!['EUR','USD','GBP'].includes(r.currency))throw Error('Unsupported comparator currency');
  if(!Number.isFinite(Date.parse(r.observedAt)))throw Error('Price needs an observedAt timestamp');
  if(!r.license||typeof r.license!=='string'||r.license.length>160)throw Error('Price needs its license scope');
  return {url:url.href,title:String(r.title||'Comparable product').slice(0,160),amount:r.amount,currency:r.currency,license:r.license,observedAt:new Date(r.observedAt).toISOString()};
 });
}
export function priceFromMarket(o,config,now=Date.now()){
 const discount=config.priceDiscount??.1,seen=new Set(),excluded=[],references=[];
 for(const r of o.priceEvidence||[]){
  const age=now-Date.parse(r.observedAt);if(age< -60000||age>30*86400000){excluded.push({url:r.url,reason:'Price observation expired or in the future'});continue;}
  if(seen.has(r.url))continue;seen.add(r.url);
  let rate=1;
  if(r.currency!=='EUR'){
   const fx=o.exchangeRates,fxAge=now-Date.parse(fx?.date);
   if(!fx||fx.source!=='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'||!Number.isFinite(fxAge)||fxAge<0||fxAge>7*86400000||typeof fx.rates?.[r.currency]!=='number'||fx.rates[r.currency]<=0){excluded.push({url:r.url,reason:'Current ECB conversion required'});continue;}
   rate=fx.rates[r.currency];
  }
  references.push({...r,eurAmount:r.amount/rate,unitsPerEuro:rate});
 }
 if(!references.length)return {status:'NEEDS_PRICE_EVIDENCE',currency:'EUR',priceCents:null,references,excluded,reason:'No current comparable price with a supported currency conversion. Production waits for pricing evidence.'};
 const benchmark=Math.min(...references.map(r=>r.eurAmount)),priceCents=Math.floor((benchmark*(1-discount)+1e-9)*100),costFloorCents=Math.ceil((o.estimatedProductionCost||0)/(1-(config.minimumExpectedMargin??.5))*100);
 const ready=priceCents>0&&priceCents<benchmark*100&&priceCents>=costFloorCents;
 return {status:ready?'PRICED':'BELOW_COST_FLOOR',currency:'EUR',priceCents:ready?priceCents:null,benchmarkEur:Math.round(benchmark*100)/100,discount,method:'lowest-comparable-less-discount',references,excluded,exchangeRates:o.exchangeRates||null,costFloorCents,simulated:!!o.simulated,reason:ready?`${Math.round(discount*100)}% below the lowest observed comparable paid license; rounded down to cents. Scope differs; this is not a claim of equivalent features or proven demand.`:'Discounted price cannot meet the estimated cost/margin floor; production blocked.'};
}
export const productPriceCents=p=>p.priceCents??2000; // Historical products retain their original price.
