import { expect, fixture } from '../utils';
import { attribute, customElement, emitter, mounted, property, type Emitter } from '../../lib/decorators';
import { GemElement, html, createRef, createState } from '../../lib/element';

@customElement('app-children')
export class Children extends GemElement {
  @property value?: { value: number };
  @attribute attr: string;
  @emitter sayHi: Emitter<null>;

  inputRef = createRef<HTMLInputElement>();

  @mounted()
  #init = () => this.sayHi();

  render() {
    return html`<input ${this.inputRef} />`;
  }
}

@customElement('app-root')
export class App extends GemElement {
  childrenRef1 = createRef<Children>();
  childrenRef2 = createRef<Children>();

  // 还未 mounted, 不应该发生错误
  #state = createState({});
  #onSayHi = () => this.#state();

  render() {
    return html`
      <app-children ${this.childrenRef1} .value=${{ value: 1 }} attr="1" @say-hi=${this.#onSayHi}></app-children>
      <app-children ${this.childrenRef2} .value=${{ value: 2 }} attr="2"></app-children>
    `;
  }
}
describe('多个 gem element 一起工作', () => {
  it('ref & prop & attr', async () => {
    const el: App = await fixture(html`<app-root></app-root>`);
    const children1 = el.childrenRef1.value!;
    const children2 = el.childrenRef2.value!;
    const input1 = children1.inputRef.value!;
    const input2 = children2.inputRef.value!;
    expect(input1 !== input2).to.equal(true);
    expect(children1.value).to.eql({ value: 1 });
    expect(children2.value).to.eql({ value: 2 });
    expect(children1.attr).to.eql('1');
    expect(children2.attr).to.eql('2');
  });
});
