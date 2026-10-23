import {APP_PROFILES} from './product-strategy.mjs';
import {robotsAllows} from './research.mjs';

// Public product documentation, never paid downloads. Only these fixed origins
// may be fetched; URLs and redirects from page content are not followed.
export const PRODUCT_SOURCES={
 kanban:['https://www.todoist.com/inspiration/kanban-board','https://trello.com/'],
 expense:['https://actualbudget.org/docs/getting-started/tracking-budget/','https://www.firefly-iii.org/'],
 habit:['https://loophabits.org/','https://www.openhabittracker.net/'],
 notes:['https://joplinapp.org/help/','https://standardnotes.com/'],
 focus:['https://pomofocus.io/','https://www.focustodo.cn/']
};
const plain=s=>s.replace(/<(script|style|nav|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim();
async function read(url,request,signal){
 const r=await request(url,{redirect:'error',signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(15000)])});
 if(!r.ok)throw Error('Product source HTTP '+r.status);
 let size=0;const chunks=[];for await(const chunk of r.body){size+=chunk.length;if(size>2000000)throw Error('Product source too large');chunks.push(chunk);}return Buffer.concat(chunks).toString();
}
export async function readProductSources(variant,{request=fetch,signal}={}){
 const references=[],checks=[];
 for(const url of PRODUCT_SOURCES[variant]||[]){
  try{
   signal?.throwIfAborted();const u=new URL(url),robots=await request(u.origin+'/robots.txt',{redirect:'error',signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(10000)])});
   if(robots.ok){if(!robotsAllows((await robots.text()).slice(0,100000),u.pathname))throw Error('Source excludes automated research');}else if(robots.status!==404)throw Error('Source robots policy unavailable');
   const html=await read(url,request,signal),title=plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').slice(0,180),content=plain(html);
   const match=content.match(APP_PROFILES[variant].match);if(!title||!match)throw Error('Product capability could not be confirmed in page text');
   const observation=content.slice(Math.max(0,match.index-50),match.index+290);
   references.push({url,title,observation,observedAt:new Date().toISOString(),basis:'Public product page read live; narrower independent implementation, not feature parity or verified demand'});checks.push({url,status:'READ'});
  }catch(e){signal?.throwIfAborted();checks.push({url,status:'UNAVAILABLE',reason:e.message});}
 }
 return {references,checks};
}
