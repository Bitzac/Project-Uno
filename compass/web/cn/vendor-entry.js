// Tencent CloudBase JS SDK (app + auth + database + realtime only), exposed as window.CB.
// Bundled by build.mjs so the China site loads nothing from outside mainland China.
import cloudbase from '@cloudbase/js-sdk/app';
import { registerAuth } from '@cloudbase/js-sdk/auth';
import { registerDatabase } from '@cloudbase/js-sdk/database';
import { registerRealtime } from '@cloudbase/js-sdk/realtime';

registerAuth(cloudbase);
registerDatabase(cloudbase);
registerRealtime(cloudbase);
window.CB = cloudbase;
