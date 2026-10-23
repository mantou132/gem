import type { GemUnsafeElement } from '../../elements/unsafe';
import { css, html } from '../../lib/element';
import { expect, fixture, nextFrame } from '../utils';

import '../../elements/unsafe';

describe('GemUnsafeElement', () => {
  it('渲染 HTML 字符串，应用样式', async () => {
    const ele: GemUnsafeElement = await fixture(
      html`<gem-unsafe html="<p>a</p>" .styles=${css`p { color: rgb(255, 0, 0); }`}></gem-unsafe>`,
    );
    const color = () => getComputedStyle(ele.shadowRoot!.querySelector('p')!).color;
    expect(ele.shadowRoot!.querySelector('p')!.textContent).to.equal('a');
    expect(color()).to.equal('rgb(255, 0, 0)');
    ele.styles = 'p { color: rgb(0, 0, 255); }';
    await nextFrame();
    expect(color()).to.equal('rgb(0, 0, 255)');
    ele.html = '<b>b</b>';
    await nextFrame();
    expect(ele.shadowRoot!.innerHTML).to.equal('<b>b</b>');
  });
});
