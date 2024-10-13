import { fixture, expect, nextFrame } from '../utils';
import { createCSSSheet, GemElement, html } from '../../lib/element';
import { adoptedStyle, customElement } from '../../lib/decorators';
import type { GemReflectElement } from '../../elements/reflect';

import '../../elements/reflect';

@customElement('light-dom')
@adoptedStyle(createCSSSheet(`:scope { color: rgb(255, 0, 0) }`))
export class Children extends GemElement {}

describe('GemReflectElement', () => {
  it('basic', async () => {
    const reflect: GemReflectElement = await fixture(html`
      <gem-reflect>
        <div id="one"></div>
        <div id="two"></div>
        <light-dom></light-dom>
      </gem-reflect>
    `);
    const div = document.head.querySelector('#one');
    expect(!!div).to.equal(true);
    const comment = new Comment();
    div?.after(comment);
    reflect.target = document.body;
    await nextFrame();
    expect(document.body.querySelector('#one')).to.equal(div);
    expect(getComputedStyle(document.body.querySelector('light-dom')!).color).to.equal('rgb(255, 0, 0)');
    expect(div?.nextSibling).to.equal(comment);
    reflect.remove();
    expect(!!document.querySelector('#one')).to.equal(false);
  });
});
