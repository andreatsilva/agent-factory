// Run locally. No default credentials, network enrollment or password in GitHub.
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {passwordRecord} from './operator-auth.mjs';
const dir=join(dirname(fileURLToPath(import.meta.url)),'data'),file=join(dir,'operator-auth.json');
if(existsSync(file)&&!process.argv.includes('--reset'))throw Error('Operator already configured. Use --reset locally to replace the password, then restart the public viewer to revoke all sessions.');
mkdirSync(dir,{recursive:true});
const password=randomBytes(32).toString('base64url'),record=await passwordRecord('admin',password);
writeFileSync(file,JSON.stringify(record)+'\n',{mode:0o600});
writeFileSync(join(dir,'operator-login.txt'),'NEO FACTORY / PRIVATE OPERATOR LOGIN\n\nWebsite: https://andreatsilva.github.io/agent-factory/operator.html\nUsername: admin\nPassword: '+password+'\n\nStore this password in your password manager, then delete this local delivery file.\nNever commit or share this file. Sessions expire after one hour; reload requires login.\nReset locally: node setup-operator.mjs --reset, then restart viewer-server.mjs.\n',{mode:0o600});
console.log('Operator account saved. Credentials are in data/operator-login.txt; no password was printed. Restart the public viewer to activate.');
