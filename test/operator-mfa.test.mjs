import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {base32,totp,verifyTotp,validateMfa} from '../operator-mfa.mjs';
import {createOperatorAuth,passwordRecord} from '../operator-auth.mjs';
import {openOperatorSecurity} from '../operator-security-store.mjs';
import {createViewerServer} from '../viewer-server.mjs';
import {createOperatorClient} from '../operator-client.mjs';
const password='isolated-test-only-password-9274',credentials={username:'admin',password},recordPromise=passwordRecord('admin',password);
const secret=base32(Buffer.from('12345678901234567890')),initial=1700000000000;
const header=session=>'Bearer '+session.token;
const configured=()=>({version:1,secret,lastStep:0,recoveryHashes:[]});
test('TOTP matches every RFC 6238 SHA-1 vector and enforces window, format and replay',()=>{
 for(const [seconds,code]of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']]){assert.equal(totp(secret,Math.floor(seconds/30),8),code);assert.equal(totp(secret,Math.floor(seconds/30)),code.slice(-6));}
 const step=Math.floor(initial/30000),code=totp(secret,step);
 assert.equal(verifyTotp(secret,code,initial),step);assert.equal(verifyTotp(secret,code,initial+30000),step);assert.equal(verifyTotp(secret,code,initial+90000),null);assert.equal(verifyTotp(secret,code,initial,step),null);assert.equal(verifyTotp(secret,Number(code),initial),null);assert.equal(verifyTotp(secret,'1234567',initial),null);
 assert.throws(()=>validateMfa({}),/Invalid MFA/);
});
test('enrollment requires fresh password, is session-bound, expires and activates only after proof',async()=>{
 let time=initial,saved=null;const record=await recordPromise,auth=createOperatorAuth({record,now:()=>time,saveMfa:value=>{saved=structuredClone(value);}});
 const first=await auth.login(credentials),second=await auth.login(credentials);
 await assert.rejects(auth.beginEnrollment(header(first),{password:'wrong'}),e=>e.status===403);
 const setup=await auth.beginEnrollment(header(first),{password});assert.equal(setup.secret.length,32);assert.equal(setup.qr.data.length,setup.qr.size**2);assert.equal(saved,null);
 const code=totp(setup.secret,Math.floor(time/30000));assert.throws(()=>auth.confirmEnrollment(header(second),{code}),e=>e.status===409);
 assert.throws(()=>auth.confirmEnrollment(header(first),{code:'invalid'}),e=>e.status===403);
 const active=auth.confirmEnrollment(header(first),{code});assert.equal(active.recoveryCodes.length,10);assert.equal(new Set(active.recoveryCodes).size,10);assert.ok(saved.secret);assert.ok(!JSON.stringify(saved).includes(active.recoveryCodes[0].replaceAll('-','')));
 assert.throws(()=>auth.authorize(header(first)),e=>e.status===401);assert.throws(()=>auth.authorize(header(second)),e=>e.status===401);assert.equal(auth.security(header(active)).enabled,true);
 assert.deepEqual(Object.keys(auth.security(header(active))).sort(),['available','enabled','recoveryCodesRemaining']);
 time+=900001;const pending=await auth.login(credentials);assert.equal(pending.mfaRequired,true);assert.ok(!pending.token);assert.throws(()=>auth.authorize('Bearer '+pending.challenge),e=>e.status===401);
 const signed=auth.verify({challenge:pending.challenge,code:totp(saved.secret,Math.floor(time/30000))});assert.ok(signed.token);assert.throws(()=>auth.verify({challenge:pending.challenge,code}),e=>e.status===401);
});
test('recovery consumption and TOTP replay protection survive gateway restart',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'neo-mfa-test-'));let store;
 try{
  store=openOperatorSecurity(directory);let time=initial;const record=await recordPromise;
  let auth=createOperatorAuth({record,now:()=>time,mfaState:store.read(),saveMfa:store.save});
  const session=await auth.login(credentials),setup=await auth.beginEnrollment(header(session),{password}),code=totp(setup.secret,Math.floor(time/30000)),active=auth.confirmEnrollment(header(session),{code});
  store.close();store=openOperatorSecurity(directory);auth=createOperatorAuth({record,now:()=>time,mfaState:store.read(),saveMfa:store.save});
  let challenge=(await auth.login(credentials)).challenge;assert.throws(()=>auth.verify({challenge,code}),e=>e.status===401);
  assert.ok(auth.verify({challenge,code:active.recoveryCodes[0]}).token);assert.equal(store.read().recoveryHashes.length,9);
  store.close();store=openOperatorSecurity(directory);auth=createOperatorAuth({record,now:()=>time,mfaState:store.read(),saveMfa:store.save});
  challenge=(await auth.login(credentials)).challenge;assert.throws(()=>auth.verify({challenge,code:active.recoveryCodes[0]}),e=>e.status===401);
  assert.ok(auth.verify({challenge,code:active.recoveryCodes[1]}).token);
 }finally{store?.close();rmSync(directory,{recursive:true,force:true});}
});
test('challenge expiry, attempt caps, enrollment cancellation and failure to persist fail closed',async()=>{
 let time=initial;const record=await recordPromise,auth=createOperatorAuth({record,now:()=>time,mfaState:configured(),saveMfa:()=>{}});
 let challenge=(await auth.login(credentials)).challenge;time+=300001;assert.throws(()=>auth.verify({challenge,code:totp(secret,Math.floor(time/30000))}),e=>e.status===401);
 challenge=(await auth.login(credentials)).challenge;for(let i=0;i<5;i++)assert.throws(()=>auth.verify({challenge,code:'bad'}),e=>e.status===401);
 assert.throws(()=>auth.verify({challenge,code:totp(secret,Math.floor(time/30000))}),e=>e.status===401);
 for(let i=0;i<3;i++)assert.throws(()=>auth.verify({challenge,code:'bad'}),e=>e.status===401);assert.throws(()=>auth.verify({challenge,code:'bad'}),e=>e.status===429);
 const enrollment=createOperatorAuth({record,now:()=>time,saveMfa:()=>{throw Error('disk full');}}),session=await enrollment.login(credentials);
 let setup=await enrollment.beginEnrollment(header(session),{password});enrollment.cancelEnrollment(header(session));assert.throws(()=>enrollment.confirmEnrollment(header(session),{code:totp(setup.secret,Math.floor(time/30000))}),e=>e.status===409);
 setup=await enrollment.beginEnrollment(header(session),{password});time+=600001;assert.throws(()=>enrollment.confirmEnrollment(header(session),{code:totp(setup.secret,Math.floor(time/30000))}),e=>e.status===409);
 setup=await enrollment.beginEnrollment(header(session),{password});assert.throws(()=>enrollment.confirmEnrollment(header(session),{code:totp(setup.secret,Math.floor(time/30000))}),/disk full/);assert.equal(enrollment.security(header(session)).enabled,false);
 const failing=createOperatorAuth({record,now:()=>time,mfaState:configured(),saveMfa:()=>{throw Error('disk full');}});challenge=(await failing.login(credentials)).challenge;assert.throws(()=>failing.verify({challenge,code:totp(secret,Math.floor(time/30000))}),/disk full/);assert.throws(()=>failing.authorize('Bearer '+challenge),e=>e.status===401);
});
test('HTTP MFA endpoints enforce origin/auth and password-only challenges cannot manage factory',async()=>{
 const origin='https://andreatsilva.github.io';let saved=null,upstreamCalls=0;
 const server=createViewerServer({operatorRecord:await recordPromise,now:()=>initial,saveMfa:v=>{saved=v;},request:async()=>{upstreamCalls++;throw Error('must not reach factory');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const call=async(path,body,token,source=origin)=>fetch(url+'/operator/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:source,...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 try{
  for(const [path,body]of [['mfa',undefined],['mfa/setup',{password}],['mfa/confirm',{code:'123456'}],['mfa/cancel',{}]])assert.equal((await call(path,body)).status,401);
  const login=await (await call('login',credentials)).json();assert.equal((await call('mfa/setup',{password},login.token,'https://evil.example')).status,403);
  const setup=await (await call('mfa/setup',{password},login.token)).json(),active=await (await call('mfa/confirm',{code:totp(setup.secret,Math.floor(initial/30000))},login.token)).json();assert.equal(active.recoveryCodes.length,10);assert.ok(saved);
  const challenge=await (await call('login',credentials)).json();for(const path of ['action/start','action/stop','action/research','action/cycle','action/config','action/crew','action/layout'])assert.equal((await call(path,{},challenge.challenge)).status,401);
  assert.equal((await call('state',undefined,challenge.challenge)).status,401);
  const verified=await (await call('verify',{challenge:challenge.challenge,code:active.recoveryCodes[0]})).json();assert.ok(verified.token);assert.equal((await call('mfa',undefined,verified.token)).status,200);assert.equal(upstreamCalls,0);
  assert.equal((await call('mfa',undefined,login.token)).status,401);assert.equal((await call('mfa/disable',{},verified.token)).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
test('browser client does not accept a challenge as a session and discards late responses on lock',async()=>{
 let requests=[],resolveVerify;const client=createOperatorClient({feedUrl:'https://example.trycloudflare.com/snapshot',request:async(url,options)=>{requests.push({url:String(url),options});if(String(url).endsWith('/login'))return new Response(JSON.stringify({mfaRequired:true,challenge:'c'.repeat(43)}));return new Promise(resolve=>{resolveVerify=resolve;});}});
 assert.deepEqual(await client.login('admin',password),{mfaRequired:true});await assert.rejects(client.state(),/Session expired/);
 await client.login('admin',password);const verifying=client.verify('123456');client.clear();resolveVerify(new Response(JSON.stringify({token:'t'.repeat(43),username:'admin',expiresAt:Date.now()+60000})));await assert.rejects(verifying,/Session ended/);
 assert.equal(requests.at(-1).options.headers.Authorization,undefined);assert.ok(!requests.at(-1).url.includes('123456'));
});
