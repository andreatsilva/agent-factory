import CONFIG from './viewer-config.mjs';
import {readPublicProducts} from './viewer-client.mjs';
import {sanitizePublicProducts} from './public-products.mjs';
const $=id=>document.getElementById(id),money=c=>c===0?'FREE':c===null?'Price research pending':'€'+(c/100).toFixed(2);
const element=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const link=(text,href,className)=>{const a=element('a',text,className);a.href=href;return a;};
let data=null,busy=false,page=1,signature='';
const types={image:'AI IMAGE',website:'WEBSITE KIT',thumbnail:'YT THUMBNAILS',logo:'LOGO CONCEPT',app:'BASIC APP'};
const variants={kanban:'PROJECT BOARD',expense:'EXPENSE TRACKER',habit:'HABIT TRACKER',notes:'NOTES WORKSPACE',focus:'FOCUS CHECKLIST',editorial:'EDITORIAL',bento:'BENTO',midnight:'MIDNIGHT',atelier:'ATELIER'};
const size=12,initial=new URL(location.href);
$('variant').value=Object.hasOwn(variants,initial.searchParams.get('variant'))?initial.searchParams.get('variant'):'all';
$('type').value=Object.hasOwn(types,initial.searchParams.get('type'))?initial.searchParams.get('type'):'all';
function assetUrl(p,kind='preview'){return CONFIG.publicView?new URL(kind+'/'+p.id,new URL('.',CONFIG.feedUrl)).href:'./api/public/'+kind+'/'+p.id;}
function preview(p){const img=element('img',undefined,'product-preview');img.alt=p.title+(p.type==='website'||p.type==='app'?' — product overview artwork':' — actual product preview');img.src=assetUrl(p);img.loading='lazy';img.referrerPolicy='no-referrer';return img;}

$('search').value=(initial.searchParams.get('q')||'').slice(0,120);
if(['newest','price-asc','price-desc','name'].includes(initial.searchParams.get('sort')))$('sort').value=initial.searchParams.get('sort');
page=Math.max(1,Number.parseInt(initial.searchParams.get('page'),10)||1);
function catalogUrl(id){const u=new URL('./products.html',location.href);if($('search').value.trim())u.searchParams.set('q',$('search').value.trim());if($('sort').value!=='newest')u.searchParams.set('sort',$('sort').value);if($('type').value!=='all')u.searchParams.set('type',$('type').value);if($('variant').value!=='all')u.searchParams.set('variant',$('variant').value);if(page>1)u.searchParams.set('page',page);if(id)u.searchParams.set('id',id);return u.href;}
function download(p){const a=link('DOWNLOAD FREE ZIP ↓',assetUrl(p,'download'),'button download');a.download=p.id+'.zip';return a;}
function priceNote(p){if(p.pricingStatus==='FREE')return 'Free for now. Download the complete product ZIP — no account required.';if(p.priceCents===null)return 'Concept preview · no asking price until comparable evidence is reviewed.';return p.discount?Math.round(p.discount*100)+'% below the recorded paid comparator.':'Price recorded when this product was created.';}
function art(p){if(p?.previewAvailable)return preview(p);const e=element('div',undefined,'product-art');e.setAttribute('aria-hidden','true');e.append(element('span','DIGITAL PRODUCT'));return e;}
function card(p){const article=element('article',undefined,'product'),copy=element('div',undefined,'copy'),h=element('h2');h.append(link(p.title,catalogUrl(p.id)));copy.append(element('p',(variants[p.variant]||types[p.type])+' / '+p.files+' FILES','eyebrow'),h,element('p',p.description,'description'));const row=element('div',undefined,'price-row');row.append(element('span',money(p.priceCents),p.priceCents===null?'price pending':'price'),element('small',p.pricingStatus==='FREE'?'TEMPORARILY FREE':p.priceCents===null?'CONCEPT / NOT YET PRICED':'EUR / one project'));copy.append(row,element('small',priceNote(p)),link('VIEW PRODUCT →',catalogUrl(p.id),'button'));if(p.downloadAvailable)copy.append(download(p));article.append(art(p),copy);return article;}
function renderDetails(id){
 const target=$('detail');target.replaceChildren();target.append(link('← BACK TO PRODUCTS',catalogUrl(),'detail-back'));
 const p=data?.products.find(p=>p.id===id);
 if(!p){target.append(element('h2',data?'Product is not available in the current catalog.':'Waiting for the product feed…'),element('p',data?'It may have been withdrawn or moved outside the latest 1,000 listings.':'Use Refresh to try the factory connection again.','muted'));return;}
 document.title=p.title+' | NEO Factory';
 target.append(element('p',p.niche+' // '+types[p.type],'eyebrow'),element('h1',p.title));
 const layout=element('div',undefined,'detail-layout'),left=element('div'),right=element('div'),about=element('section',undefined,'detail-panel');
 about.append(element('h2','Inside the kit'),element('p',p.description));const ul=element('ul');for(const f of p.features)ul.append(element('li',f));about.append(ul,element('p',p.files+(p.type==='image'?' packaged files · Original PNG and generation details.':' packaged files · Editable source and customization instructions.'),'muted'));left.append(about);
 const launch=element('section',undefined,'detail-panel');launch.append(element('h2','Before you launch'),element('p','Replace sample business details and content, then review and test your customized site. Hosting, payment processing, live booking and support are not included.'),element('p','Quality checks are automated structural checks; they do not guarantee sales or suitability for your project.','muted'));left.append(launch);
 const offer=element('section',undefined,'detail-panel');offer.append(art(p),element('p',money(p.priceCents),p.priceCents===null?'price pending':'price'),element('p',p.pricingStatus==='FREE'?'TEMPORARILY FREE':p.priceCents===null?'CONCEPT / NOT YET PRICED':'EUR / single-project kit','muted'),element('p',priceNote(p)));
 if(p.downloadAvailable)offer.append(download(p),element('p','Includes the packaged files and their usage terms. Review and customize before publishing.','muted'));
 else offer.append(element('h2','Checkout coming later'),element('p','Purchasing and delivery are not connected yet.'));
 right.append(offer);layout.append(left,right);target.append(layout);
 if(p.reviewStatus==='UNREVIEWED')target.append(element('p','CONCEPT / VISUAL REVIEW PENDING — automatic structural checks passed; suitability and visual quality still need review.','notice'));
 if(p.type!=='website'){launch.replaceChildren(element('h2','Before you use it'),element('p',p.type==='logo'?'Customize the SVG and check trademark availability. No exclusivity or trademark clearance is included.':p.type==='app'?'Runs locally in a browser. The features listed above work offline after downloading and opening index.html. This sandboxed preview cannot persist data or export a backup; there is no account, backend or synchronization.':p.type==='image'?'AI-generated illustration. Inspect details and suitability before publishing. Generation details are included in the ZIP download.':'Review thumbnail imagery and legibility at small sizes, then customize the supplied design values.'));}
 if(p.demoAvailable){const demo=element('section',undefined,'detail-panel');demo.append(element('h2','EXPLORE THE PRODUCT'));const button=element('button','OPEN INTERACTIVE PREVIEW');button.onclick=()=>{const frame=element('iframe');frame.title=p.title+' preview';frame.setAttribute('sandbox',p.type==='app'?'allow-scripts':'');frame.referrerPolicy='no-referrer';frame.src=assetUrl(p,'demo');frame.className='product-demo';demo.append(frame);button.remove();};demo.append(button);target.append(demo);}

 const steps=element('div',undefined,'steps');for(const [name,desc] of [['01 / FOUND','Market research recorded'],['02 / MADE','Package built · QA passed'],['03 / LISTED','Public details available']]){const step=element('div',name);step.append(element('small',desc));steps.append(step);}target.append(steps,element('p','CREATED '+(p.createdAt?new Date(p.createdAt).toLocaleDateString():'—')+' // '+p.id,'muted detail-id'));
}
function render(){
 const id=new URL(location.href).searchParams.get('id');document.body.classList.toggle('detailView',!!id);$('detail').hidden=!id;$('grid').hidden=!!id;$('pagination').hidden=true;
 if(id){$('empty').hidden=true;$('resultCount').textContent='PRODUCT DETAILS';renderDetails(id);return;}
 document.title='Products | NEO Factory';
 if(!data){$('empty').hidden=false;$('empty').textContent=busy?'Loading finished products from the factory…':'The factory connection is unavailable. Refresh to try again.';return;}
 const term=$('search').value.trim().toLocaleLowerCase(),sort=$('sort').value;
 const products=data.products.filter(p=>($('type').value==='all'||p.type===$('type').value)).filter(p=>$('variant').value==='all'||p.variant===$('variant').value).filter(p=>(p.title+' '+p.niche+' '+p.features.join(' ')).toLocaleLowerCase().includes(term)).sort((a,b)=>(sort==='price-asc'?(a.priceCents??Infinity)-(b.priceCents??Infinity):sort==='price-desc'?(b.priceCents??-Infinity)-(a.priceCents??-Infinity):sort==='name'?a.title.localeCompare(b.title):b.createdAt.localeCompare(a.createdAt))||a.id.localeCompare(b.id));
 const pages=Math.max(1,Math.ceil(products.length/size));page=Math.min(page,pages);
 $('resultCount').textContent=products.length+' matching / '+data.total+' completed products'+(data.total>data.products.length?' · browsing latest '+data.products.length:'');
 $('grid').replaceChildren(...products.slice((page-1)*size,page*size).map(card));$('empty').hidden=products.length>0;
 $('empty').textContent=data.products.length?'No matching products. Try a different name or niche.':'The shelves are waiting. Completed LIVE products appear here after QA and listing preparation.';
 $('pagination').hidden=pages<=1;$('previous').disabled=page<=1;$('next').disabled=page>=pages;$('pageCount').textContent='PAGE '+page+' / '+pages;
}
function filtersChanged(){page=1;history.replaceState(null,'',catalogUrl());render();}
$('filters').addEventListener('submit',e=>{e.preventDefault();filtersChanged();});$('search').addEventListener('input',filtersChanged);$('sort').addEventListener('change',filtersChanged);$('type').addEventListener('change',filtersChanged);$('variant').addEventListener('change',filtersChanged);
for(const [id,delta] of [['previous',-1],['next',1]])$(id).addEventListener('click',()=>{page+=delta;history.replaceState(null,'',catalogUrl());render();$('filters').scrollIntoView({block:'start'});});
window.addEventListener('popstate',()=>{const u=new URL(location.href);$('search').value=u.searchParams.get('q')||'';$('sort').value=u.searchParams.get('sort')||'newest';$('type').value=u.searchParams.get('type')||'all';$('variant').value=u.searchParams.get('variant')||'all';page=Number.parseInt(u.searchParams.get('page'),10)||1;render();});
async function refresh(){
 if(busy)return;busy=true;$('refresh').disabled=true;$('refresh').textContent='CONNECTING…';
 try{
  const next=CONFIG.publicView?await readPublicProducts(CONFIG.feedUrl):await (async()=>{const r=await fetch('./api/public/products',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Catalog unavailable');return sanitizePublicProducts(await r.json());})();
  const nextSignature=JSON.stringify(next.products),changed=!data||signature!==nextSignature||data.total!==next.total;
  data=next;signature=nextSignature;$('availability').textContent=data.products.length&&data.products.every(p=>p.pricingStatus==='FREE')?'Free downloads for now · No account required.':'Explore the finished product catalog.';$('connection').textContent='● FACTORY LINK ONLINE';$('connection').className='link-state live';$('error').hidden=true;
  $('updated').textContent='UPDATED '+new Date(data.generatedAt).toLocaleTimeString();if(changed)render();
 }catch{
  $('connection').textContent='○ FACTORY LINK OFFLINE';$('connection').className='link-state';$('error').hidden=false;$('error').textContent=data?'Connection lost. Showing the last received catalog; prices and availability may have changed.':'The product feed is unavailable. The PC and public tunnel must be online. Try Refresh shortly.';
  if(!data){busy=false;render();$('resultCount').textContent='Catalog unavailable';}
 }finally{busy=false;$('refresh').disabled=false;$('refresh').textContent='↻ REFRESH';}
}
$('refresh').addEventListener('click',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
setInterval(()=>{if(!document.hidden)void refresh();},30000);
window.addEventListener('offline',()=>{$('connection').textContent='○ FACTORY LINK OFFLINE';$('connection').className='link-state';$('error').hidden=false;$('error').textContent='Network connection lost. Displayed products may be out of date.';});
void refresh();render();
