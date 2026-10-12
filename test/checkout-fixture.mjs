// Development-only checkout UI fixture. Uses a temporary database and no payment provider.
import {createFactory} from '../server.mjs';
import {upstream} from './providers.mjs';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const port=Number(process.env.FIXTURE_PORT)||8788,remote=upstream();
remote.paid=true;remote.checkoutUrl=`http://127.0.0.1:${port}/success.html?session_id=cs_test_fixture`;
const app=createFactory({dataDir:mkdtempSync(join(tmpdir(),'neo-ui-fixture-')),fetch:remote.fetch,env:{STRIPE_SECRET_KEY:'fixture-not-a-real-key',FACTORY_INTERVAL_SECONDS:'999999'}});
app.server.listen(port,'127.0.0.1',async()=>{await fetch(`http://127.0.0.1:${port}/api/factory/cycle`,{method:'POST'});console.log(`ISOLATED TEST FIXTURE http://127.0.0.1:${port}/store.html`);});
