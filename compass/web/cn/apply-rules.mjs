// Create the CloudBase collections and set their security rule (owner-only). Needs @cloudbase/manager-node and
// TCB_SECRET_ID / TCB_SECRET_KEY / TCB_ENV_ID in the environment. Usage: node web/cn/apply-rules.mjs
import { readFileSync } from 'node:fs';
import CloudBase from '@cloudbase/manager-node';

const { collections, rule } = JSON.parse(readFileSync(new URL('./db-rules.json', import.meta.url), 'utf8'));
const envId = process.env.TCB_ENV_ID;
const manager = new CloudBase({ secretId: process.env.TCB_SECRET_ID, secretKey: process.env.TCB_SECRET_KEY, envId });
for (const name of collections) {
  await manager.database.createCollectionIfNotExists(name);
  await manager.commonService().call({ Action: 'ModifySafeRule', Param: { CollectionName: name, EnvId: envId, AclTag: 'CUSTOM', Rule: JSON.stringify(rule) } });
  console.log('rule set:', name);
}
