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
