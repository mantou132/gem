import '../lib/shim';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { customElement } from '@mantou/gem/lib/decorators';
import { GemElement } from '@mantou/gem/lib/reactive';

@customElement('app-demo')
class DemoElement extends GemElement {}

describe('Basic element render', async () => {
  it('The easiest', async () => {
    assert.strictEqual(1, 1);
  });
});
