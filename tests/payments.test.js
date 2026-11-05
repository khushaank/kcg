import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validHmac } from '../supabase/functions/_shared/http.ts';

test('payment signatures verify exact bytes and reject tampering',async()=>{
  const secret='test-only-secret', body='{"event":"payment.captured","amount":250000}';
  const signature=createHmac('sha256',secret).update(body).digest('hex');
  assert.equal(await validHmac(secret,body,signature),true);
  assert.equal(await validHmac(secret,body.replace('250000','1'),signature),false);
  assert.equal(await validHmac('another-secret',body,signature),false);
  assert.equal(await validHmac(secret,body,''),false);
  assert.equal(await validHmac(secret,body,'not-a-signature'),false);
});
