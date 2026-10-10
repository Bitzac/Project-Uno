// Firestore security rules for the overseas site. Needs the Firestore emulator:
//   npm run test:rules   (starts the emulator and runs this file)
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-compass',
    firestore: { rules: readFileSync(new URL('../web/global/firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const alice = () => env.authenticatedContext('alice', { email: 'a@example.com', email_verified: true }).firestore();
const bob = () => env.authenticatedContext('bob', { email: 'b@example.com', email_verified: true }).firestore();
const unverified = () => env.authenticatedContext('carol', { email: 'c@example.com', email_verified: false }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const seed = async () => env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'students/s1'), { owner: 'alice', sid: 's1', name: 'A' });
  await setDoc(doc(db, 'scores/r1'), { owner: 'alice', sid: 's1', value: 90 });
  await setDoc(doc(db, 'screens/p1'), { owner: 'alice', sid: 's1', scale: 'GAD-7', score: 11 });
});

test('owner reads and queries own records', async () => {
  await seed();
  await assertSucceeds(getDoc(doc(alice(), 'scores/r1')));
  await assertSucceeds(getDocs(query(collection(alice(), 'scores'), where('owner', '==', 'alice'), where('sid', '==', 's1'))));
});

test('another account cannot read, list, change or delete them', async () => {
  await seed();
  await assertFails(getDoc(doc(bob(), 'scores/r1')));
  await assertFails(getDoc(doc(bob(), 'screens/p1')));
  await assertFails(getDocs(collection(bob(), 'scores')));
  await assertFails(getDocs(query(collection(bob(), 'scores'), where('owner', '==', 'alice'))));
  await assertFails(setDoc(doc(bob(), 'scores/r1'), { owner: 'bob', sid: 's1', value: 0 }));
  await assertFails(deleteDoc(doc(bob(), 'scores/r1')));
});

test('signed-out and unverified users get nothing', async () => {
  await seed();
  await assertFails(getDoc(doc(anon(), 'scores/r1')));
  await assertFails(setDoc(doc(unverified(), 'scores/x'), { owner: 'carol', sid: 's1', value: 1 }));
  await assertFails(getDocs(query(collection(unverified(), 'scores'), where('owner', '==', 'carol'))));
});

test('cannot create records for someone else or move a record to another owner', async () => {
  await seed();
  await assertFails(setDoc(doc(bob(), 'scores/r2'), { owner: 'alice', sid: 's1', value: 1 }));
  await assertSucceeds(setDoc(doc(alice(), 'scores/r2'), { owner: 'alice', sid: 's1', value: 1 }));
  await assertFails(setDoc(doc(alice(), 'scores/r1'), { owner: 'bob', sid: 's1', value: 90 }));
  await assertFails(setDoc(doc(alice(), 'scores/r1'), { owner: 'alice', sid: 's2', value: 90 }));
  await assertFails(setDoc(doc(alice(), 'scores/r3'), { owner: 'alice', value: 1 }));   // records need a sid
});

test('unknown collections are closed', async () => {
  await assertFails(setDoc(doc(alice(), 'admin/x'), { owner: 'alice', sid: 's1' }));
});

test('settings: only your own document, and only known fields', async () => {
  await assertSucceeds(setDoc(doc(unverified(), 'settings/carol'), { owner: 'carol', consent: { version: '2026-10' } }));
  await assertFails(setDoc(doc(alice(), 'settings/bob'), { owner: 'bob', consent: {} }));
  await assertFails(setDoc(doc(alice(), 'settings/alice'), { owner: 'alice', role: 'admin' }));
  await assertFails(getDoc(doc(bob(), 'settings/carol')));
});
