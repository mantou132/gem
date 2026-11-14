import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  emitter,
  template,
} from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';

import type { TapInputElement } from '../elements/input';
import { locale } from '../lib/locale';
import { theme } from '../lib/theme';

import '../elements/button';
import '../elements/input';
import '../elements/navbar';
import '../elements/page';

const style = css({
  $: `
    display: block;
    flex-grow: 1;
    contain: layout;
  `,
  done: `
    margin-inline-end: 0.5em;
  `,
  body: `
    display: block;
    margin-block-start: 1em;
    overflow: hidden;
    border-radius: calc(${theme.normalRound} * 3);
    background: ${theme.backgroundColor};
  `,
  // 融入卡片，去掉控件自身的边框和阴影
  input: `
    display: flex;
    width: 100%;
    font-size: 1em;
    padding-inline: calc(1.0625em - 0.5em) 0.5em;
    padding-block: 0.5em;
    border: none;
    border-radius: 0;
    box-shadow: none;
    &:not([type='textarea']) {
      block-size: 2.75rem;
      padding-block: 0;
    }
  `,
  description: `
    padding: 0.5em calc(1.0625em / 0.8125) 0.75em;
    font-size: 0.8125em;
    line-height: 1.3;
    color: ${theme.describeColor};
  `,
});

/**
 * 单字段编辑页，例如设置中的名称、简介
 *
 * 点击完成或回车后只发出 `change`，关闭或返回由调用方处理
 */
@customElement('tap-pat-editor')
@adoptedStyle(style)
@connectStore(locale)
export class TapPatEditorElement extends GemElement {
  @attribute heading: string;
  @attribute value: string;
  @attribute placeholder: string;
  /**Note below the input, e.g. what the value is used for */
  @attribute description: string;
  @attribute type: TapInputElement['type'];
  /**Show the back button of the navbar, pops the closest stack */
  @boolattribute back: boolean;
  /**Disable done while the value is blank */
  @boolattribute required: boolean;

  @emitter change: Emitter<string>;

  #state = createState({ draft: undefined as string | undefined });

  get #draft() {
    return this.#state.draft ?? this.value;
  }

  get #canDone() {
    const draft = this.#draft;
    return draft !== this.value && !(this.required && !draft.trim());
  }

  #onInput = (evt: CustomEvent<string>) => {
    // `<tap-input>` 的 `change` 会冒泡，避免和自身的 `change` 混淆
    evt.stopPropagation();
    this.#state({ draft: evt.detail });
  };

  #onKeyDown = (evt: KeyboardEvent) => {
    if (evt.key === 'Enter' && !evt.isComposing && this.type !== 'textarea') this.#done();
  };

  #done = () => {
    if (this.#canDone) this.change(this.#draft);
  };

  @template()
  #content = () => {
    return html`
      <tap-page>
        <tap-navbar slot="header" title=${this.heading} ?back=${this.back} default-back>
          <tap-button
            slot="right"
            class=${style.done}
            small
            round
            ?disabled=${!this.#canDone}
            @click=${this.#done}
          >${locale.done}</tap-button>
        </tap-navbar>
        <div class=${style.body}>
          <tap-input
            class=${style.input}
            type=${this.type}
            value=${this.#draft}
            placeholder=${this.placeholder}
            ?required=${this.required}
            autofocus
            clearable
            @change=${this.#onInput}
            @clear=${this.#onInput}
            @keydown=${this.#onKeyDown}
          ></tap-input>
        </div>
        <div v-if=${!!this.description} class=${style.description}>${this.description}</div>
      </tap-page>
    `;
  };
}
