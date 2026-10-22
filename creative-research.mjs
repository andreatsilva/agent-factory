const decode=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
export function parseResearchFeed(xml){
 const rows=[],seen=new Set();
 for(const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)){
  const field=name=>decode(match[1].match(new RegExp('<'+name+'>([\\s\\S]*?)</'+name+'>'))?.[1]||'');
  let url;try{url=new URL(field('link'));}catch{continue;}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||seen.has(url.href))continue;
  const title=field('title');if(!title)continue;seen.add(url.href);
  rows.push({url:url.href.slice(0,600),title:title.slice(0,180),observation:field('description').slice(0,350),observedAt:new Date().toISOString(),basis:'Search index excerpt; listing scope, price and demand not verified'});
 }
 return rows.slice(0,5);
}
export async function researchCreative(kind,niche,{request=fetch,signal}={}){
 const term={image:'editorial illustration digital art',thumbnail:'YouTube thumbnail templates',logo:'editable vector logo templates',app:'offline checklist focus timer app'}[kind];if(!term)throw Error('Unsupported creative research type');
 const query=term+' '+niche.slice(0,100),url=new URL('https://www.bing.com/search');url.searchParams.set('format','rss');url.searchParams.set('q',query);url.searchParams.set('setlang','en');
 const r=await request(url,{signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(12000)]),redirect:'error'});
 if(!r.ok)throw Error('Creative research HTTP '+r.status);
 let size=0,chunks=[];for await(const chunk of r.body){size+=chunk.length;if(size>500000)throw Error('Research response too large');chunks.push(chunk);}
 const references=parseResearchFeed(Buffer.concat(chunks).toString());if(!references.length)throw Error('No readable search results');
 return {query,references,status:'SEARCHED',priceStatus:'NOT_VERIFIED'};
}
