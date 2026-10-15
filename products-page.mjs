import CONFIG from './viewer-config.mjs';
import {readPublicProducts} from './viewer-client.mjs';
import {sanitizePublicProducts} from './public-products.mjs';
const $=id=>document.getElementById(id),money=c=>'€'+(c/100).toFixed(2);
const element=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const link=(text,href,className)=>{const a=element('a',text,className);a.href=href;return a;};
let data=null,busy=false,page=1,signature='';
const size=12,initial=new URL(location.href);
$('search').value=(initial.searchParams.get('q')||'').slice(0,120);
if(['newest','price-asc','price-desc','name'].includes(initial.searchParams.get('sort')))$('sort').value=initial.searchParams.get('sort');
page=Math.max(1,Number.parseInt(initial.searchParams.get('page'),10)||1);
function catalogUrl(id){const u=new URL('./products.html',location.href);if($('search').value.trim())u.searchParams.set('q',$('search').value.trim());if($('sort').value!=='newest')u.searchParams.set('sort',$('sort').value);if(page>1)u.searchParams.set('page',page);if(id)u.searchParams.set('id',id);return u.href;}
function priceNote(p){return p.discount?Math.round(p.discount*100)+'% below the recorded paid comparator.':'Price recorded when this product was created.';}
function art(){const e=element('div',undefined,'product-art');e.setAttribute('aria-hidden','true');e.append(element('span','DIGITAL KIT // QA PASSED'));return e;}
function card(p){const article=element('article',undefined,'product'),copy=element('div',undefined,'copy'),h=element('h2');h.append(link(p.title,catalogUrl(p.id)));copy.append(element('p',p.niche+' / '+p.files+' FILES','eyebrow'),h,element('p',p.description,'description'));const row=element('div',undefined,'price-row');row.append(element('span',money(p.priceCents),'price'),element('small','EUR / one project'));copy.append(row,element('small',priceNote(p)),link('VIEW PRODUCT →',catalogUrl(p.id),'button'));article.append(art(),copy);return article;}
function renderDetails(id){
 const target=$('detail');target.replaceChildren();target.append(link('← BACK TO PRODUCTS',catalogUrl(),'detail-back'));
 const p=data?.products.find(p=>p.id===id);
 if(!p){target.append(element('h2',data?'Product is not available in the current catalog.':'Waiting for the product feed…'),element('p',data?'It may have been withdrawn or moved outside the latest 1,000 listings.':'Use Refresh to try the factory connection again.','muted'));return;}
 document.title=p.title+' | NEO Factory';
 target.append(element('p',p.niche+' // ORIGINAL DIGITAL KIT','eyebrow'),element('h1',p.title));
 const layout=element('div',undefined,'detail-layout'),left=element('div'),right=element('div'),about=element('section',undefined,'detail-panel');
 about.append(element('h2','Inside the kit'),element('p',p.description));const ul=element('ul');for(const f of p.features)ul.append(element('li',f));about.append(ul,element('p',p.files+' packaged files · Editable source and customization instructions.','muted'));left.append(about);
 const launch=element('section',undefined,'detail-panel');launch.append(element('h2','Before you launch'),element('p','Replace sample business details and content, then review and test your customized site. Hosting, payment processing, live booking and support are not included.'),element('p','Quality checks are automated structural checks; they do not guarantee sales or suitability for your project.','muted'));left.append(launch);
 const offer=element('section',undefined,'detail-panel');offer.append(art(),element('p',money(p.priceCents),'price'),element('p','EUR / single-project kit','muted'),element('p',priceNote(p)),element('p','Comparators can differ in features, updates and support. Asking prices do not establish demand.','muted'),element('h2','Checkout coming later'),element('p','This is a public product showcase. Purchasing and delivery are not connected yet.'));right.append(offer);layout.append(left,right);target.append(layout);
 const steps=element('div',undefined,'steps');for(const [name,desc] of [['01 / FOUND','Market research recorded'],['02 / MADE','Package built · QA passed'],['03 / LISTED','Public details available']]){const step=element('div',name);step.append(element('small',desc));steps.append(step);}target.append(steps,element('p','CREATED '+(p.createdAt?new Date(p.createdAt).toLocaleDateString():'—')+' // '+p.id,'muted detail-id'));
}
function render(){
 const id=new URL(location.href).searchParams.get('id');document.body.classList.toggle('detailView',!!id);$('detail').hidden=!id;$('grid').hidden=!!id;$('pagination').hidden=true;
 if(id){$('empty').hidden=true;$('resultCount').textContent='PRODUCT DETAILS';renderDetails(id);return;}
 document.title='Products | NEO Factory';
 if(!data){$('empty').hidden=false;$('empty').textContent=busy?'Loading finished products from the factory…':'The factory connection is unavailable. Refresh to try again.';return;}
 const term=$('search').value.trim().toLocaleLowerCase(),sort=$('sort').value;
 const products=data.products.filter(p=>(p.title+' '+p.niche).toLocaleLowerCase().includes(term)).sort((a,b)=>(sort==='price-asc'?a.priceCents-b.priceCents:sort==='price-desc'?b.priceCents-a.priceCents:sort==='name'?a.title.localeCompare(b.title):b.createdAt.localeCompare(a.createdAt))||a.id.localeCompare(b.id));
 const pages=Math.max(1,Math.ceil(products.length/size));page=Math.min(page,pages);
 $('resultCount').textContent=products.length+' matching / '+data.total+' completed products'+(data.total>data.products.length?' · browsing latest '+data.products.length:'');
 $('grid').replaceChildren(...products.slice((page-1)*size,page*size).map(card));$('empty').hidden=products.length>0;
 $('empty').textContent=data.products.length?'No matching products. Try a different name or niche.':'The shelves are waiting. Completed LIVE products appear here after QA and listing preparation.';
 $('pagination').hidden=pages<=1;$('previous').disabled=page<=1;$('next').disabled=page>=pages;$('pageCount').textContent='PAGE '+page+' / '+pages;
}
function filtersChanged(){page=1;history.replaceState(null,'',catalogUrl());render();}
$('filters').addEventListener('submit',e=>{e.preventDefault();filtersChanged();});$('search').addEventListener('input',filtersChanged);$('sort').addEventListener('change',filtersChanged);
for(const [id,delta] of [['previous',-1],['next',1]])$(id).addEventListener('click',()=>{page+=delta;history.replaceState(null,'',catalogUrl());render();$('filters').scrollIntoView({block:'start'});});
window.addEventListener('popstate',()=>{const u=new URL(location.href);$('search').value=u.searchParams.get('q')||'';$('sort').value=u.searchParams.get('sort')||'newest';page=Number.parseInt(u.searchParams.get('page'),10)||1;render();});
async function refresh(){
 if(busy)return;busy=true;$('refresh').disabled=true;$('refresh').textContent='CONNECTING…';
 try{
  const next=CONFIG.publicView?await readPublicProducts(CONFIG.feedUrl):await (async()=>{const r=await fetch('./api/public/products',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Catalog unavailable');return sanitizePublicProducts(await r.json());})();
  const nextSignature=JSON.stringify(next.products),changed=!data||signature!==nextSignature||data.total!==next.total;
  data=next;signature=nextSignature;$('connection').textContent='● FACTORY LINK ONLINE';$('connection').className='link-state live';$('error').hidden=true;
  $('updated').textContent='UPDATED '+new Date(data.generatedAt).toLocaleTimeString();if(changed)render();
 }catch{
  $('connection').textContent='○ FACTORY LINK OFFLINE';$('connection').className='link-state';$('error').hidden=false;$('error').textContent=data?'Connection lost. Showing the last received catalog; prices and availability may have changed.':'The product feed is unavailable. The PC and public tunnel must be online. Try Refresh shortly.';
  if(!data){busy=false;render();$('resultCount').textContent='Catalog unavailable';}
 }finally{busy=false;$('refresh').disabled=false;$('refresh').textContent='↻ REFRESH';}
}
$('refresh').addEventListener('click',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
setInterval(()=>{if(!document.hidden)void refresh();},30000);
window.addEventListener('offline',()=>{$('connection').textContent='○ FACTORY LINK OFFLINE';$('connection').className='link-state';$('error').hidden=false;$('error').textContent='Network connection lost. Displayed products may be out of date.';});
render();void refresh();
