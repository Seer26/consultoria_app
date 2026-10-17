import { test } from 'node:test';
import assert from 'node:assert/strict';

test('JWT signing never falls back to the public development secret', async()=>{
  const config=await import('../src/config/env');
  const resolver=(config as unknown as {resolveJwtSecret?:(env:Record<string,string|undefined>)=>string}).resolveJwtSecret;
  assert.equal(typeof resolver,'function');
  const first=resolver!({});const second=resolver!({});
  assert.notEqual(first,second);assert.ok(first.length>=64);
  assert.throws(()=>resolver!({NODE_ENV:'production'}));
  assert.throws(()=>resolver!({JWT_SECRET:'short'}));
  const secret='test-only-configured-secret-with-32-characters';
  assert.equal(resolver!({NODE_ENV:'production',JWT_SECRET:secret}),secret);
});
