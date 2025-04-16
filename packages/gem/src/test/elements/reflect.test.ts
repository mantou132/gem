import type { GemReflectElement } from '../../elements/reflect';
import { adoptedStyle, customElement } from '../../lib/decorators';
import { css, GemElement, html } from '../../lib/element';
import { expect, fixture, nextFrame } from '../utils';

import '../../elements/reflect';

@adoptedStyle(css`
  :scope {
    color: rgb(255, 0, 0);
  }
`)
@customElement('light-dom')
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
