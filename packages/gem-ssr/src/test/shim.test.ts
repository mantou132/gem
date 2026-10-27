import '../lib/shim';

import test from 'node:test';

import { runInRequest } from '..';

test('localStorage：每个请求独立，不在请求中时可以使用', async ({ assert }) => {
  localStorage.setItem('token', 'global');
  const values = await Promise.all(
    ['alice', 'bob'].map((name) =>
      runInRequest(async () => {
        assert.equal(localStorage.getItem('token'), null);
        localStorage.setItem('token', name);
        await new Promise((resolve) => setTimeout(resolve, 1));
        return [localStorage.getItem('token'), localStorage.length, localStorage.key(0)];
      }),
    ),
  );
  assert.deepEqual(values, [
    ['alice', 1, 'token'],
    ['bob', 1, 'token'],
  ]);
  assert.equal(localStorage.getItem('token'), 'global');
  localStorage.clear();
  assert.equal(localStorage.length, 0);
  assert.equal(sessionStorage instanceof Storage, true);
});
