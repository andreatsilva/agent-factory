import {sanitizeSnapshot} from './public-snapshot.mjs';
export function validateFeedUrl(value,{allowLoopback=false}={}){
 if(!value)return '';
 const u=new URL(value),loopback=['127.0.0.1','localhost','[::1]'].includes(u.hostname);
 if((u.protocol!=='https:'&&!(allowLoopback&&loopback&&u.protocol==='http:'))||u.username||u.password||u.search||u.hash||u.pathname!=='/snapshot')throw Error('Feed URL must be HTTPS and end in /snapshot, without credentials or query parameters');
 return u.href;
}
export async function readPublicSnapshot(url,request=fetch){
 const feed=validateFeedUrl(url,{allowLoopback:typeof location!=='undefined'&&['127.0.0.1','localhost','[::1]'].includes(location.hostname)});
 if(!feed)throw Error('Live feed not configured');
 const r=await request(feed,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Factory feed unavailable');
 const snapshot=sanitizeSnapshot(await r.json());
 if(Math.abs(Date.now()-snapshot.generatedAt)>30000)throw Error('Factory feed is stale');
 return snapshot;
}
export async function sendPublicMessage(feedUrl,message,history=[],request=fetch){
 const feed=validateFeedUrl(feedUrl,{allowLoopback:typeof location!=='undefined'&&['127.0.0.1','localhost','[::1]'].includes(location.hostname)});
 if(!feed)throw Error('Public chat is not connected');
 const r=await request(new URL('/chat',feed).href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,history:history.slice(-6).map(t=>({role:t.role,content:t.content.slice(0,600)}))}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(60000)});
 const data=await r.json();if(!r.ok)throw Error(data.error||'NEO could not reply');
 if(data.mode!=='conversation-only'||typeof data.reply!=='string')throw Error('Invalid NEO reply');
 return data.reply.slice(0,1800);
}
