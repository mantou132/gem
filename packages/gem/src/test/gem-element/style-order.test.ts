import { adoptedStyle, customElement, shadow } from '../../lib/decorators';
import { css, GemElement, html } from '../../lib/element';
import { expect, fixture, nextFrame } from '../utils';

// light DOM 子元素，其样式会被添加到所在渲染根（shadowRoot / document）
@customElement('style-order-light-a')
@adoptedStyle(css`
  :scope {
    display: block;
  }
`)
class StyleOrderLightA extends GemElement {}

@customElement('style-order-light-b')
@adoptedStyle(css`
  :scope {
    display: block;
  }
`)
class StyleOrderLightB extends GemElement {}

const parentStyle = css`
  :host {
    background: rgb(255, 0, 0);
  }
`;

const childStyle = css`
  :host {
    background: rgb(0, 128, 0);
  }
`;

@customElement('style-order-parent')
@adoptedStyle(parentStyle)
@shadow()
class StyleOrderParent extends GemElement {
  showB = false;
  render = () => html`
    <style-order-light-a></style-order-light-a>
    ${this.showB ? html`<style-order-light-b></style-order-light-b>` : ''}
  `;
}

// 子类样式在父类之后声明，应该覆盖父类
@customElement('style-order-child')
@adoptedStyle(childStyle)
class StyleOrderChild extends StyleOrderParent {}

// light 元素父子类：子类样式在父类之后声明，应该覆盖父类
@customElement('style-order-light-parent')
@adoptedStyle(css`
  :scope {
    display: block;
    color: rgb(255, 0, 0);
  }
`)
class StyleOrderLightParent extends GemElement {}

@customElement('style-order-light-child')
@adoptedStyle(css`
  :scope {
    color: rgb(0, 128, 0);
  }
`)
class StyleOrderLightChild extends StyleOrderLightParent {}

const flush = async () => {
  await Promise.resolve();
  await nextFrame();
};

describe('样式表顺序', () => {
  it('shadowRoot 中有 light 子元素时，保持宿主样式表顺序', async () => {
    const el: StyleOrderChild = await fixture(html`<style-order-child></style-order-child>`);
    await flush();
    expect(window.getComputedStyle(el).backgroundColor).to.equal('rgb(0, 128, 0)');

    // 再次触发根样式更新（新增/移除 light 子元素），顺序必须稳定
    for (const showB of [true, false, true]) {
      el.showB = showB;
      el.update();
      await flush();
      expect(window.getComputedStyle(el).backgroundColor).to.equal('rgb(0, 128, 0)');
    }
  });

  it('light 元素子类样式覆盖父类', async () => {
    const el = await fixture(html`
      <div>
        <style-order-light-parent></style-order-light-parent>
        <style-order-light-child></style-order-light-child>
      </div>
    `);
    await flush();
    const parent = el.querySelector('style-order-light-parent')!;
    const child = el.querySelector('style-order-light-child') as StyleOrderLightChild;
    expect(window.getComputedStyle(parent).color).to.equal('rgb(255, 0, 0)');
    expect(window.getComputedStyle(child).color).to.equal('rgb(0, 128, 0)');
    expect(window.getComputedStyle(child).display).to.equal('block');

    // 在 shadowRoot 中也一样，并且增删其他元素后保持
    const host = await fixture(html`<style-order-child></style-order-child>`);
    const light = new StyleOrderLightChild();
    host.shadowRoot!.append(light);
    await flush();
    expect(window.getComputedStyle(light).color).to.equal('rgb(0, 128, 0)');
    host.shadowRoot!.append(new StyleOrderLightB());
    await flush();
    expect(window.getComputedStyle(light).color).to.equal('rgb(0, 128, 0)');
  });

  it('light 元素样式在前，外部样式表在后且保持原有顺序', async () => {
    const red = new CSSStyleSheet();
    red.replaceSync('.style-order-external { color: rgb(255, 0, 0); }');
    const green = new CSSStyleSheet();
    green.replaceSync('.style-order-external { color: rgb(0, 128, 0); }');
    const origin = document.adoptedStyleSheets;
    document.adoptedStyleSheets = [...origin, red, green];
    try {
      const el = await fixture(html`
        <div>
          <span class="style-order-external"></span>
          <style-order-light-a></style-order-light-a>
        </div>
      `);
      const span = el.querySelector('span')!;
      const check = () => {
        const sheets = document.adoptedStyleSheets;
        expect(sheets.indexOf(red)).to.lessThan(sheets.indexOf(green));
        expect(sheets.at(-1)).to.equal(green);
        expect(window.getComputedStyle(span).color).to.equal('rgb(0, 128, 0)');
      };
      await flush();
      check();

      el.append(new StyleOrderLightB());
      await flush();
      check();

      el.querySelector('style-order-light-b')!.remove();
      await flush();
      check();
    } finally {
      document.adoptedStyleSheets = origin;
    }
  });
});

export { StyleOrderLightA };
