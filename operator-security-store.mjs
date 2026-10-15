// Separate from password provisioning: a password reset never disables MFA.
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateMfa} from './operator-mfa.mjs';
export function openOperatorSecurity(directory){
 mkdirSync(directory,{recursive:true,mode:0o700});
 if(process.platform==='win32'){
  const system=join(process.env.SystemRoot||'C:\\Windows','System32');
  const identity=execFileSync(join(system,'whoami.exe'),['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true});
  const sid=identity.match(/S-1-5-[\d-]+/)?.[0];if(!sid)throw Error('Cannot protect operator security directory');
  execFileSync(join(system,'icacls.exe'),[directory,'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)F'],{stdio:'pipe',windowsHide:true});
 }else chmodSync(directory,0o700);
 const db=new DatabaseSync(join(directory,'mfa.sqlite'));
 db.exec('PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS security (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL)');
 const read=()=>{const row=db.prepare('SELECT value FROM security WHERE id=1').get();return row?validateMfa(JSON.parse(row.value)):null;};
 // One SQLite commit persists secret, replay counter and consumed recovery codes together.
 return {read,save(value){validateMfa(value);db.prepare('INSERT INTO security(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(value));},close:()=>db.close()};
}
