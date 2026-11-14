import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, attribute, customElement, emitter, template } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';

import '../elements/button';
import '../elements/page';
import '../elements/use';

export type ResultStatus = 'success' | 'error' | 'warning' | 'info';

const style = css({
  $: `
    display: block;
    flex-grow: 1;
    contain: layout;
  `,
  body: `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75em;
    box-sizing: border-box;
    min-height: 100%;
    padding: 2em 1.5em;
    text-align: center;
  `,
  icon: `
    width: 4.5em;
    margin-block-end: 0.5em;
    color: ${theme.positiveColor};
    :scope[status='error'] & {
      color: ${theme.negativeColor};
    }
    :scope[status='warning'] & {
      color: ${theme.noticeColor};
    }
    :scope[status='info'] & {
      color: ${theme.informativeColor};
    }
  `,
  heading: `
    margin: 0;
    font-size: 1.375em;
    font-weight: 600;
    line-height: 1.3;
    color: ${theme.highlightColor};
  `,
  description: `
    margin: 0;
    line-height: 1.5;
    color: ${theme.describeColor};
  `,
  actions: `
    display: flex;
    flex-direction: column;
    gap: 0.75em;
    width: min(100%, 20em);
    margin-block-start: 1.5em;
  `,
  button: `
    width: 100%;
    height: 3rem;
    font-size: 1em;
  `,
});

/**
 * 结果页，例如操作成功/失败、需要权限
 *
 * 按钮只发出事件，跳转或关闭由调用方处理
 */
@customElement('tap-pat-result')
@adoptedStyle(style)
export class TapPatResultElement extends GemElement {
  /**Defaults to `success` */
  @attribute status: ResultStatus;
  @attribute heading: string;
  @attribute description: string;
  /**Label of the primary button, hidden when not set */
  @attribute primary: string;
  /**Label of the secondary button, hidden when not set */
  @attribute secondary: string;

  @emitter primaryclick: Emitter<null>;
  @emitter secondaryclick: Emitter<null>;

  @template()
  #content = () => {
    return html`
      <tap-page>
        <div class=${style.body}>
          <tap-use class=${style.icon} .element=${icons[this.status || 'success']}></tap-use>
          <h2 v-if=${!!this.heading} class=${style.heading}>${this.heading}</h2>
          <p v-if=${!!this.description} class=${style.description}>${this.description}</p>
          <div v-if=${!!(this.primary || this.secondary)} class=${style.actions}>
            <tap-button v-if=${!!this.primary} class=${style.button} round @click=${() => this.primaryclick(null)}>
              ${this.primary}
            </tap-button>
            <tap-button
              v-if=${!!this.secondary}
              class=${style.button}
              round
              borderless
              type="reverse"
              @click=${() => this.secondaryclick(null)}
            >
              ${this.secondary}
            </tap-button>
          </div>
        </div>
      </tap-page>
    `;
  };
}
