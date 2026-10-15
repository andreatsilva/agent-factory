import {randomBytes,scrypt as derive,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import QRCode from 'qrcode';
import {newSecret,verifyTotp,enrollmentUri,validateMfa} from './operator-mfa.mjs';
const scrypt=promisify(derive),options={N:131072,r:8,p:1,maxmem:192*1024*1024};
const fail=(status,message)=>Object.assign(Error(message),{status});
const digest=value=>createHash('sha256').update(value).digest('hex');
export async function passwordRecord(username,password){
 if(typeof username!=='string'||!/^[a-zA-Z0-9_-]{3,40}$/.test(username)||typeof password!=='string'||password.length<16||password.length>256)throw Error('Use a username of 3–40 letters/numbers and a password of 16–256 characters');
 const salt=randomBytes(32).toString('hex'),hash=(await scrypt(password,salt,64,options)).toString('hex');
 return {version:1,username,salt,hash};
}
export function validateRecord(record){
 if(record?.version!==1||typeof record.username!=='string'||!/^[a-zA-Z0-9_-]{3,40}$/.test(record.username)||!/^[a-f0-9]{64}$/.test(record.salt)||!/^[a-f0-9]{128}$/.test(record.hash))throw Error('Invalid operator credentials');
 return record;
}
export function createOperatorAuth({record,now=Date.now,audit=()=>{},mfaState=null,saveMfa=null}={}){
 if(record)validateRecord(record);
 let mfa=validateMfa(mfaState);
 if(mfa&&!saveMfa)throw Error('MFA requires durable storage');
 const sessions=new Map(),challenges=new Map(),enrollments=new Map();let attempts=[],factorAttempts=[],checking=false;
 const emit=(event,status)=>{try{audit({at:new Date(now()).toISOString(),event,status});}catch{}};
 const prune=()=>{for(const map of [sessions,challenges,enrollments])for(const [key,s]of map)if(s.expiresAt<=now())map.delete(key);};
 const issue=()=>{prune();while(sessions.size>=2)sessions.delete(sessions.keys().next().value);const token=randomBytes(32).toString('base64url'),session={username:record.username,expiresAt:now()+3600000};sessions.set(digest(token),session);emit('login',200);return {token,...session};};
 const save=value=>{if(!saveMfa)throw fail(503,'MFA storage is unavailable');saveMfa(value);mfa=value;};
 const factorLimit=()=>{factorAttempts=factorAttempts.filter(t=>now()-t<900000);if(factorAttempts.length>=10)throw fail(429,'Too many verification attempts. Try again in 15 minutes.');factorAttempts.push(now());};
 const checkPassword=async password=>{
  attempts=attempts.filter(t=>now()-t<900000);
  if(attempts.length>=8||attempts.filter(t=>now()-t<60000).length>=4)throw fail(429,'Too many login attempts. Try again in 15 minutes.');
  if(checking)throw fail(429,'Login is busy. Try again shortly.');
  attempts.push(now());checking=true;
  try{if(typeof password!=='string'||password.length<1||password.length>256)return false;return timingSafeEqual(await scrypt(password,record.salt,64,options),Buffer.from(record.hash,'hex'));}finally{checking=false;}
 };
 return {
  async login(input){
   if(!record)throw fail(503,'Remote operator login has not been configured on the PC');
   try{
    if(!input||Object.keys(input).some(k=>!['username','password'].includes(k))||typeof input.username!=='string'||typeof input.password!=='string'||input.password.length<1||input.password.length>256)throw fail(401,'Invalid username or password');
    const correct=await checkPassword(input.password);
    if(!correct||input.username!==record.username)throw fail(401,'Invalid username or password');
    if(mfa){prune();while(challenges.size>=4)challenges.delete(challenges.keys().next().value);const challenge=randomBytes(32).toString('base64url'),expiresAt=now()+300000;challenges.set(digest(challenge),{expiresAt,tries:0});return {mfaRequired:true,challenge,expiresAt};}
    return issue();
   }catch(e){emit('login-denied',e.status||503);throw e;}
  },
  verify(input){
   factorLimit();prune();
   if(!input||Object.keys(input).some(k=>!['challenge','code'].includes(k))||typeof input.challenge!=='string'||typeof input.code!=='string'||input.code.length>64)throw fail(401,'Invalid verification request');
   const key=digest(input.challenge),challenge=challenges.get(key);
   if(!mfa||!challenge)throw fail(401,'Verification expired. Sign in again.');
   if(++challenge.tries>=5)challenges.delete(key);
   const step=verifyTotp(mfa.secret,input.code,now(),mfa.lastStep);
   const code=input.code.replaceAll('-','').toLowerCase(),recovery=/^[a-f0-9]{32}$/.test(code)?digest(code):'';
   const index=mfa.recoveryHashes.findIndex(hash=>recovery&&timingSafeEqual(Buffer.from(hash),Buffer.from(recovery)));
   if(step===null&&index<0){emit('mfa-denied',401);throw fail(401,'Invalid or already used code. Use the next app code, or a recovery code.');}
   save({...mfa,lastStep:step??mfa.lastStep,recoveryHashes:mfa.recoveryHashes.filter((_,i)=>i!==index)});
   challenges.delete(key);emit(index>=0?'mfa-recovery':'mfa-verified',200);return issue();
  },
  security(header){this.authorize(header);return {enabled:!!mfa,available:!!saveMfa,recoveryCodesRemaining:mfa?.recoveryHashes.length||0};},
  async beginEnrollment(header,input){
   this.authorize(header);if(mfa)throw fail(409,'MFA is already enabled');if(!saveMfa)throw fail(503,'MFA storage is unavailable');
   if(!input||Object.keys(input).some(k=>k!=='password'))throw fail(400,'Expected your current password');
   if(!await checkPassword(input.password))throw fail(403,'Incorrect password');
   this.authorize(header);if(mfa)throw fail(409,'MFA is already enabled');
   const secret=newSecret(),expiresAt=now()+600000,uri=enrollmentUri(secret,record.username),qr=QRCode.create(uri,{errorCorrectionLevel:'M'}).modules;
   enrollments.set(digest(header.slice(7)),{secret,expiresAt,tries:0});
   return {secret,expiresAt,qr:{size:qr.size,data:Array.from(qr.data)}};
  },
  confirmEnrollment(header,input){
   this.authorize(header);factorLimit();prune();
   if(mfa)throw fail(409,'MFA is already enabled');
   if(!input||Object.keys(input).some(k=>k!=='code'))throw fail(400,'Expected an authenticator code');
   const key=digest(header.slice(7)),pending=enrollments.get(key);if(!pending)throw fail(409,'Setup expired. Start authenticator setup again.');
   if(++pending.tries>=5)enrollments.delete(key);
   const step=verifyTotp(pending.secret,input.code,now());if(step===null)throw fail(403,'Invalid code. Check the app and your phone clock.');
   const recoveryCodes=Array.from({length:10},()=>randomBytes(16).toString('hex'));
   save({version:1,secret:pending.secret,lastStep:step,recoveryHashes:recoveryCodes.map(digest)});
   this.revokeAll();emit('mfa-enabled',200);
   return {...issue(),recoveryCodes:recoveryCodes.map(c=>c.match(/.{4}/g).join('-'))};
  },
  cancelEnrollment(header){this.authorize(header);enrollments.delete(digest(header.slice(7)));return {ok:true};},
  authorize(header){
   prune();if(typeof header!=='string'||!/^Bearer [A-Za-z0-9_-]{43}$/.test(header))throw fail(401,'Sign in to manage the factory');
   const session=sessions.get(digest(header.slice(7)));if(!session)throw fail(401,'Session expired. Sign in again.');return session;
  },
  logout(header){this.authorize(header);sessions.delete(digest(header.slice(7)));enrollments.delete(digest(header.slice(7)));emit('logout',200);},
  revokeAll(){sessions.clear();challenges.clear();enrollments.clear();emit('logout-all',200);}
 };
}
