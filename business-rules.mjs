import {validateBrief} from './product-planner.mjs';
import {createHash} from 'node:crypto';
import {normalizePrices,priceFromMarket} from './market-pricing.mjs';
export const DEFAULT_BUSINESS_CONFIG={hardwareScaling:1,mode:'LIVE',priceDiscount:.1,approvalScore:70,minQualityScore:80,maxRevisions:1,maxAgents:124,maxAgentsPerDepartment:{research:24,website:64,quality:12,product:12,sales:12,thumbnails:24},maxConcurrentJobs:1,continuousProduction:0,researchIntervalMs:300000,minimumQueueBeforeScaling:2,scaleCooldown:60000,scaleSustainMs:30000,idleScaleDownMs:120000,dailyBudget:20,hourlyAIBudget:1,maxCostPerProduct:1,maxResearchSpendPerOpportunity:.1,maxAutomaticRevisionCost:.3,minimumExpectedMargin:.5,localCostPerMinute:0,minimumViews:100,minimumOrders:3,minimumAgeDays:7,strongConversion:.02,weakConversion:.005,killLossWindows:3,maxVariantsPerProduct:1};
export const euro=n=>Math.round(n*100)/100;
const clip=n=>Math.max(0,Math.min(100,n));
export function opportunityFingerprint(o){return createHash('sha256').update([o.productType||'website',o.niche,o.deliverable||'landing-page',o.locale||'en'].map(v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()).join('|')).digest('hex').slice(0,24);}
export function normalizeOpportunity(o,mode,source='manual'){
 if(!o||typeof o!=='object'||Array.isArray(o))throw Error('Each opportunity must be an object');
 for(const key of ['title','niche'])if(typeof o[key]!=='string'||!o[key].trim()||o[key].length>160)throw Error(key+' must be 1–160 characters');
 if(o.productType&&o.productType!=='website')throw Error('This production line supports website products only');
 const number=(key,fallback=0,max=100)=>{const n=o[key]??fallback;if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max)throw Error('Invalid '+key);return n;};
 const evidence=Array.isArray(o.evidence)?o.evidence.slice(0,12):[];
 for(const e of evidence){if(!e||typeof e.url!=='string'||!/^https?:\/\//.test(e.url)||e.url.length>500||typeof e.observation!=='string'||e.observation.length>1000)throw Error('Evidence needs a public URL and a short observation');}
 if(mode==='LIVE'&&(source==='demo'||o.simulated))throw Error('Simulated research cannot enter LIVE mode');
 return {title:o.title.trim(),niche:o.niche.trim(),productType:'website',websiteBrief:o.deliverable==='generated-website-v1'?validateBrief(o.websiteBrief):null,deliverable:['generated-website-v1','hospitality-kit-v1','restaurant-kit-v2','agency-kit-v1','interior-kit-v1','business-kit-v1'].includes(o.deliverable)?o.deliverable:'landing-page',locale:'en',category:'Website creation',marketplace:o.marketplace||'generic',source,sourceUrl:evidence[0]?.url||null,evidence,simulated:mode==='DEMO',observedDemand:number('observedDemand'),competition:number('competition',50),priceEvidence:normalizePrices(o.priceEvidence),exchangeRates:o.exchangeRates||null,estimatedPrice:null,estimatedProductionCost:number('estimatedProductionCost',.1,1000),estimatedTokenCost:0,estimatedProductionTime:1,automationDifficulty:number('automationDifficulty',10),qualityRisk:number('qualityRisk',10),legalRisk:number('legalRisk'),platformRisk:number('platformRisk',20),confidence:number('confidence',40),trendScore:number('trendScore',50),repeatability:number('repeatability',85),scalability:number('scalability',85),manualWork:number('manualWork',5),requiredCapabilities:['website-template','html-qa','listing-package'],reasoning:typeof o.reasoning==='string'?o.reasoning.slice(0,1500):'Evidence supplied by '+source,parentId:typeof o.parentId==='string'?o.parentId:null,status:'DISCOVERED'};
}
export function scoreOpportunity(o,config=DEFAULT_BUSINESS_CONFIG){
 const pricing=priceFromMarket(o,config),estimatedPrice=pricing.priceCents===null?0:pricing.priceCents/100;
 const margin=estimatedPrice?(estimatedPrice-o.estimatedProductionCost)/estimatedPrice:0;
 const parts={demand:clip(o.observedDemand)*.25,competitionOpportunity:(100-clip(o.competition))*.15,margin:clip(margin*100)*.15,ease:(100-clip(o.automationDifficulty))*.10,automation:(100-clip(o.manualWork))*.15,repeatability:clip(o.repeatability)*.10,scalability:clip(o.scalability)*.10};
 const penalties={legal:o.legalRisk*.25,platform:o.platformRisk*.1,manual:o.manualWork*.1,cost:o.estimatedProductionCost>config.maxCostPerProduct?20:0,evidence:o.evidence.length<2?25:Math.max(0,60-o.confidence)*.3,saturation:o.competition>85?10:0};
 const score=Math.round(clip(Object.values(parts).reduce((a,b)=>a+b,0)-Object.values(penalties).reduce((a,b)=>a+b,0)));
 const approved=pricing.status==='PRICED'&&score>=config.approvalScore&&o.legalRisk<50&&o.platformRisk<70&&margin>=config.minimumExpectedMargin&&o.evidence.length>=2&&o.confidence>=50;
 return {score,parts,penalties,pricing,estimatedPrice,estimatedProfit:euro(estimatedPrice-o.estimatedProductionCost),approved,reason:`${approved?'APPROVED':'REJECTED'}: ${pricing.status} · ${estimatedPrice?('EUR '+estimatedPrice.toFixed(2)):'no price'} · score ${score}/100; demand ${o.observedDemand}, competition opportunity ${100-o.competition}, automation ${100-o.manualWork}, expected margin ${Math.round(margin*100)}%; ${o.evidence.length} references; confidence ${o.confidence}. ${o.simulated?'DEMO evidence only.':'Observed/imported signals are not guaranteed sales.'}`};
}
export function performanceDecision(m,c=DEFAULT_BUSINESS_CONFIG){
 if(m.lossWindows>=c.killLossWindows&&m.orders>=c.minimumOrders)return {action:'KILL',reason:'Repeated measured losses across distinct reporting windows'};
 if(m.orders>=c.minimumOrders&&m.netProfit<0)return {action:'PAUSE',reason:'Sufficient orders but negative recorded profit'};
 if(m.views>=c.minimumViews&&m.orders>=c.minimumOrders&&m.conversionRate>=c.strongConversion&&m.netProfit>0&&m.supportRate<.5&&m.costCoverage)return {action:'SCALE',reason:'Sufficient traffic, strong conversion and positive recorded profit'};
 if(m.views>=c.minimumViews&&m.conversionRate<c.weakConversion)return {action:'OPTIMIZE',reason:'Traffic is sufficient but conversion is weak; improve presentation'};
 if(m.ageDays>=c.minimumAgeDays&&m.views<c.minimumViews&&m.orders===0)return {action:'PAUSE',reason:'No meaningful traction after the observation period'};
 return {action:'CONTINUE',reason:m.costCoverage?'Collect more independent sales evidence before scaling':'Costs are not fully priced; retain observations without claiming verified profit'};
}
export function validateConfig(current,patch){
 const next={...current};for(const [key,value]of Object.entries(patch)){
  if(!(key in DEFAULT_BUSINESS_CONFIG))throw Error('Unknown configuration field: '+key);
  if(key==='mode'){if(!['DEMO','LIVE'].includes(value))throw Error('Mode must be DEMO or LIVE');}
  else if(key==='maxAgentsPerDepartment'){if(!value||typeof value!=='object'||Array.isArray(value)||Object.entries(value).some(([k,v])=>!['research','website','quality','product','sales','thumbnails'].includes(k)||!Number.isInteger(v)||v<1||v>124))throw Error('Invalid department capacity');next[key]={...current[key],...value};continue;}
  else if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100000000)throw Error('Invalid '+key);
  next[key]=value;
 }
 for(const k of ['approvalScore','minQualityScore'])if(next[k]>100)throw Error(k+' cannot exceed 100');
 if(next.priceDiscount<=0||next.priceDiscount>.5)throw Error('Price discount must be greater than 0 and at most 0.5');
 for(const k of ['minimumExpectedMargin','strongConversion','weakConversion'])if(next[k]>1)throw Error(k+' must be 0–1');
 for(const k of ['maxAgents','maxRevisions','maxConcurrentJobs','minimumQueueBeforeScaling','minimumOrders','killLossWindows','maxVariantsPerProduct'])if(!Number.isInteger(next[k]))throw Error(k+' must be an integer');
 if(next.maxAgents<18||next.maxAgents>124||next.maxRevisions>3||(next.maxConcurrentJobs<1||next.maxConcurrentJobs>4)||next.minimumQueueBeforeScaling<1||next.minimumOrders<1||next.killLossWindows<2||next.maxVariantsPerProduct>2)throw Error('Capacity/revision limits exceed this MVP');
 if(![0,1].includes(next.hardwareScaling))throw Error('Hardware scaling must be 0 or 1');
 if(![0,1].includes(next.continuousProduction)||!Number.isInteger(next.researchIntervalMs)||next.researchIntervalMs<60000||next.researchIntervalMs>3600000)throw Error('Continuous production must be 0 or 1; research interval must be 1–60 minutes');
 return next;
}
