import { expect, fixture } from '@open-wc/testing';

import { attribute, customElement, property } from '../../lib/decorators';
import { GemElement, html, createRef } from '../../lib/element';

@customElement('app-children')
export class Children extends GemElement {
  @property value?: { value: number };
  @attribute attr: string;
  inputRef = createRef<HTMLInputElement>();

  render() {
    return html`<input ref=${this.inputRef.ref} />`;
  }
}

@customElement('app-root')
export class App extends GemElement {
  childrenRef1 = createRef<Children>();
  childrenRef2 = createRef<Children>();
  render() {
    return html`
      <app-children ref=${this.childrenRef1.ref} .value=${{ value: 1 }} attr="1"></app-children>
      <app-children ref=${this.childrenRef2.ref} .value=${{ value: 2 }} attr="2"></app-children>
    `;
  }
}
describe('多个 gem element 一起工作', () => {
  it('ref & prop & attr', async () => {
    const el: App = await fixture(html`<app-root></app-root>`);
    const children1 = el.childrenRef1.element!;
    const children2 = el.childrenRef2.element!;
    const input1 = children1.inputRef.element!;
    const input2 = children2.inputRef.element!;
    expect(input1 !== input2).to.equal(true);
    expect(children1.value).to.eql({ value: 1 });
    expect(children2.value).to.eql({ value: 2 });
    expect(children1.attr).to.eql('1');
    expect(children2.attr).to.eql('2');
  });
});
