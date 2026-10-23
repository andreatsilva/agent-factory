// Public listing fields only; never forward packages, operator paths or raw database rows.
const text=(v,max)=>typeof v==='string'?v.slice(0,max):'';
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max?v:0;
export function sanitizePublicProducts(input){
 if(input?.version!==1||input.mode!=='LIVE'||!Number.isFinite(input.generatedAt)||!Array.isArray(input.products))throw Error('Invalid public catalog');
 const seen=new Set();
 const products=input.products.slice(0,1000).filter(p=>{
  if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)||seen.has(p.id)||!text(p.title,160).trim())return false;
  if(!(p.priceCents===0&&p.pricingStatus==='FREE')&&!(p.priceCents===null&&p.pricingStatus==='RESEARCH_PENDING')&&(!Number.isSafeInteger(p.priceCents)||p.priceCents<=0||p.priceCents>10000000))return false;
  seen.add(p.id);return true;
 }).map(p=>({id:p.id,title:text(p.title,160),niche:text(p.niche,100),description:text(p.description,600),priceCents:p.priceCents,
  variant:['kanban','expense','habit','notes','focus','editorial','bento','midnight','atelier'].includes(p.variant)?p.variant:null,
  type:['website','thumbnail','logo','app','image'].includes(p.type)?p.type:'website',previewAvailable:p.previewAvailable===true,demoAvailable:p.demoAvailable===true,
  downloadAvailable:p.downloadAvailable===true&&p.priceCents===0&&p.pricingStatus==='FREE',pricingStatus:p.pricingStatus==='FREE'&&p.priceCents===0?'FREE':p.priceCents===null?'RESEARCH_PENDING':'PRICED',reviewStatus:p.reviewStatus==='UNREVIEWED'?'UNREVIEWED':'QA_PASSED',
  discount:Number.isFinite(p.discount)&&p.discount>0&&p.discount<1?p.discount:null,
  files:integer(p.files,1000),createdAt:typeof p.createdAt==='string'&&Number.isFinite(Date.parse(p.createdAt))?new Date(p.createdAt).toISOString():'',
  features:Array.isArray(p.features)?p.features.filter(f=>typeof f==='string').slice(0,12).map(f=>text(f,220)):[]
 }));
 return {version:1,mode:'LIVE',generatedAt:input.generatedAt,total:Math.max(products.length,integer(input.total,10000000)),products};
}
export function createPublicProducts(catalog,time=Date.now(),{freeDownloads=false}={}){
 if(catalog.mode!=='LIVE')throw Error('Only LIVE products may be public');
 return sanitizePublicProducts({version:1,mode:'LIVE',generatedAt:time,total:catalog.total,products:freeDownloads?catalog.products.map(p=>({...p,priceCents:0,pricingStatus:'FREE',discount:null,downloadAvailable:true})):catalog.products});
}
