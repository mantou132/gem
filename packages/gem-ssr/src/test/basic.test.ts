import '../lib/shim';

import test from 'node:test';

import { customElement } from '@mantou/gem/lib/decorators';
import { GemElement } from '@mantou/gem/lib/reactive';
import { html } from '@mantou/gem/lib/lit-html';

import { renderToString } from '..';

@customElement('app-demo')
export class DemoElement extends GemElement {}

test('basic', async (t) => {
  t.assert.snapshot(renderToString(html`<app-demo></app-demo>`));
});
