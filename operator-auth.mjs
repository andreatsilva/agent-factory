import {randomBytes,scrypt as derive,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
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
export function createOperatorAuth({record,now=Date.now,audit=()=>{}}={}){
 if(record)validateRecord(record);
 const sessions=new Map();let attempts=[],checking=false;
 const emit=(event,status)=>{try{audit({at:new Date(now()).toISOString(),event,status});}catch{}};
 const prune=()=>{for(const [key,s]of sessions)if(s.expiresAt<=now())sessions.delete(key);};
 return {
  async login(input){
   if(!record)throw fail(503,'Remote operator login has not been configured on the PC');
   attempts=attempts.filter(t=>now()-t<900000);
   if(attempts.length>=8||attempts.filter(t=>now()-t<60000).length>=4)throw fail(429,'Too many login attempts. Try again in 15 minutes.');
   if(checking)throw fail(429,'Login is busy. Try again shortly.');
   attempts.push(now());checking=true;
   try{
    if(!input||Object.keys(input).some(k=>!['username','password'].includes(k))||typeof input.username!=='string'||typeof input.password!=='string'||input.password.length<1||input.password.length>256)throw fail(401,'Invalid username or password');
    const hash=await scrypt(input.password,record.salt,64,options);
    const correct=timingSafeEqual(hash,Buffer.from(record.hash,'hex'));
    if(!correct||input.username!==record.username)throw fail(401,'Invalid username or password');
    prune();while(sessions.size>=2)sessions.delete(sessions.keys().next().value);
    const token=randomBytes(32).toString('base64url'),session={username:record.username,expiresAt:now()+3600000};sessions.set(digest(token),session);emit('login',200);
    return {token,...session};
   }catch(e){emit('login-denied',e.status||503);throw e;}finally{checking=false;}
  },
  authorize(header){
   prune();if(typeof header!=='string'||!/^Bearer [A-Za-z0-9_-]{43}$/.test(header))throw fail(401,'Sign in to manage the factory');
   const session=sessions.get(digest(header.slice(7)));if(!session)throw fail(401,'Session expired. Sign in again.');return session;
  },
  logout(header){this.authorize(header);sessions.delete(digest(header.slice(7)));emit('logout',200);},
  revokeAll(){sessions.clear();emit('logout-all',200);}
 };
}
