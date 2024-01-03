import { fixture, expect, nextFrame } from '@open-wc/testing';

import { html } from '../../lib/element';
import type { GemReflectElement } from '../../elements/reflect';

import '../../elements/reflect';

describe('GemReflectElement', () => {
  it('basic', async () => {
    const reflect: GemReflectElement = await fixture(html`
      <gem-reflect>
        <div id="one"></div>
        <div id="two"></div>
      </gem-reflect>
    `);
    const div = document.head.querySelector('#one');
    expect(!!div).to.equal(true);
    const comment = new Comment();
    div?.after(comment);
    reflect.target = document.body;
    await nextFrame();
    expect(document.body.querySelector('#one')).to.equal(div);
    expect(div?.nextSibling).to.equal(comment);
    reflect.remove();
    expect(!!document.querySelector('#one')).to.equal(false);
  });
});
