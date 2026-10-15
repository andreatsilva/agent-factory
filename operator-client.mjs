import CONFIG from './viewer-config.mjs';
import {validateFeedUrl} from './viewer-client.mjs';
// Session credentials live only in this closure. No cookies or browser persistence.
export function createOperatorClient({feedUrl=CONFIG.feedUrl,request=fetch,onExpired=()=>{}}={}){
 let token='',challenge='',expiresAt=0,epoch=0;
 const clear=()=>{token='';challenge='';expiresAt=0;epoch++;};
 const accept=result=>{if(!/^[A-Za-z0-9_-]{43}$/.test(result.token)||!Number.isFinite(result.expiresAt)||result.expiresAt<=Date.now())throw Error('Invalid login response');token=result.token;expiresAt=result.expiresAt;challenge='';epoch++;return {username:result.username,expiresAt,...(result.recoveryCodes?{recoveryCodes:result.recoveryCodes}:{})};};
 async function call(path,body,authenticated=true){
  const feed=validateFeedUrl(feedUrl,{allowLoopback:typeof location!=='undefined'&&['127.0.0.1','localhost','[::1]'].includes(location.hostname)});
  if(!feed)throw Error('Operator connection not configured. Use the hosted site after configuring the PC gateway.');
  if(authenticated&&(!token||Date.now()>=expiresAt)){clear();onExpired();throw Error('Session expired. Sign in again.');}
  const generation=epoch;
  const r=await request(new URL('/operator/'+path,feed),{method:body===undefined?'GET':'POST',headers:{...(authenticated?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(50000)});
  const data=await r.json();
  if(generation!==epoch)throw Error('Session ended');
  if(!r.ok){if(r.status===401&&authenticated){clear();onExpired();}throw Error(data.error||'Operator request failed');}return data;
 }
 return {
  async login(username,password){clear();const result=await call('login',{username,password},false);if(result.mfaRequired){if(!/^[A-Za-z0-9_-]{43}$/.test(result.challenge))throw Error('Invalid verification response');challenge=result.challenge;return {mfaRequired:true};}return accept(result);},
  async verify(code){if(!challenge)throw Error('Sign in with your password first');return accept(await call('verify',{challenge,code},false));},
  security:()=>call('mfa'),beginEnrollment:password=>call('mfa/setup',{password}),
  async confirmEnrollment(code){return accept(await call('mfa/confirm',{code}));},
  cancelEnrollment:()=>call('mfa/cancel',{}),
  state:()=>call('state'),action:(name,body={})=>{if(!['start','stop','research','cycle','config','crew','layout'].includes(name))throw Error('Unknown action');return call('action/'+name,body);},
  async logout(all=false){try{await call(all?'logout-all':'logout',{});}finally{clear();}},
  clear
 };
}
