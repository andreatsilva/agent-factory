import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newSecret(){return base32(randomBytes(20));}
export function base32(bytes){let bits=0,value=0,out='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}if(bits)out+=alphabet[(value<<(5-bits))&31];return out;}
function decode(secret){let bits=0,value=0,out=[];for(const c of secret){const n=alphabet.indexOf(c);if(n<0)throw Error('Invalid MFA key');value=(value<<5)|n;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}return Buffer.from(out);}
export function totp(secret,step,digits=6){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));const h=createHmac('sha1',decode(secret)).update(counter).digest(),offset=h[19]&15;return String((h.readUInt32BE(offset)&0x7fffffff)%10**digits).padStart(digits,'0');}
export function verifyTotp(secret,code,now,lastStep=-1){
 if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;
 const current=Math.floor(now/30000);for(const step of [current,current-1,current+1])if(step>=0&&step>lastStep&&timingSafeEqual(Buffer.from(code),Buffer.from(totp(secret,step))))return step;
 return null;
}
export function enrollmentUri(secret,username){return 'otpauth://totp/'+encodeURIComponent('NEO Factory:'+username)+'?'+new URLSearchParams({secret,issuer:'NEO Factory',algorithm:'SHA1',digits:'6',period:'30'});}
export function validateMfa(value){
 if(value===null)return null;
 if(!value||value.version!==1||typeof value.secret!=='string'||!/^[A-Z2-7]{32}$/.test(value.secret)||!Number.isSafeInteger(value.lastStep)||value.lastStep<0||!Array.isArray(value.recoveryHashes)||value.recoveryHashes.length>10||value.recoveryHashes.some(h=>typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h)))throw Error('Invalid MFA state; refusing password-only fallback');
 return value;
}
