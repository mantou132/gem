import { type GemReflectElement, getLogicalParent } from '../../elements/reflect';
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

  it('logical parent', async () => {
    const reflect: GemReflectElement = await fixture(html`
      <gem-reflect .target=${document.body}><div id="three"><span></span></div></gem-reflect>
    `);
    const div = document.body.querySelector('#three')!;
    expect(getLogicalParent(div)).to.equal(reflect);
    expect(getLogicalParent(div.firstElementChild!)).to.equal(div);
    // 移动后插入片段的节点
    const added = document.createElement('p');
    div.after(added);
    expect(getLogicalParent(added)).to.equal(reflect);
    // 片段外的节点
    expect(getLogicalParent(reflect.parentElement!)).to.equal(document.body);
    const host = document.createElement('div');
    const child = host.attachShadow({ mode: 'open' }).appendChild(document.createElement('p'));
    expect(getLogicalParent(child)).to.equal(host);
    reflect.remove();
  });
});
