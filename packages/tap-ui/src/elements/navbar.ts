import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  emitter,
  part,
  shadow,
  slot,
  template,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { closestElement } from '../lib/element';
import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import type { TapPageElement } from './page';
import { Stack } from './stack';

import './use';

const style = css`
  :host(:where(:not([hidden]))) {
    display: grid;
    grid-template-columns: minmax(2.5em, max-content) 1fr minmax(2.5em, max-content);
    grid-template-rows: 2.5em;
    align-items: center;
    flex-shrink: 0;
    gap: 0.25em;
    padding-inline: 0.25em;
    padding-block: 0.5em;
    padding-block-start: calc(0.5em + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)));
    box-sizing: border-box;
    background: ${theme.backgroundColor};
    border-block-end: 1px solid ${theme.borderColor};
    color: ${theme.highlightColor};
    transition:
      background 150ms ${theme.timingFunction},
      border-color 150ms ${theme.timingFunction};
  }
  :host([transparent]) {
    background: transparent;
    border-block-end-color: transparent;
  }
  .left {
    grid-column: 1;
    display: flex;
    align-items: center;
    min-width: 0;
    height: 100%;
  }
  .back,
  slot[name='left']::slotted(tap-use),
  slot[name='right']::slotted(tap-use) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5em;
    height: 2.5em;
    box-sizing: border-box;
    margin: 0;
    padding: 0.5em;
    border: none;
    border-radius: ${theme.normalRound};
    background: transparent;
    color: ${theme.primaryColor};
    font: inherit;
    cursor: pointer;
  }
  .center {
    grid-column: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 0;
    height: 100%;
    transition: opacity 150ms ${theme.timingFunction};
  }
  :host([transparent]) :where(.center, .title) {
    opacity: 0;
  }
  .title {
    width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    font-size: 1.0625em;
    font-weight: 600;
    line-height: 1.3;
  }
  .title.small {
    font-size: 0.9375em;
    line-height: 1.2;
  }
  .subtitle {
    width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    font-size: 0.75em;
    line-height: 1.2;
    color: ${theme.describeColor};
  }
  .right {
    grid-column: 3;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
    height: 100%;
  }
`;

@customElement('tap-navbar')
@shadow()
@adoptedStyle(style)
@aria({ role: 'banner' })
export class TapNavbarElement extends GemElement {
  @part static title: string;
  @part static subtitle: string;
  @slot @part static right: string;
  @slot @part static left: string;

  @attribute title: string;
  @attribute subtitle: string;
  @boolattribute back: boolean;
  @boolattribute defaultBack: boolean;
  /**Set by `<tap-page floatheader>` while content is not scrolled */
  @boolattribute transparent: boolean;

  @emitter backclick: Emitter<null>;

  #backClick = () => {
    const tapPage = closestElement<TapPageElement>(this, 'tap-page');
    if (this.defaultBack && !tapPage?.disableNavigation) {
      Stack.getClosestStack(this)?.pop();
    }
    this.backclick(null);
  };

  @template()
  #content = () => {
    return html`
      <div class="left" part=${TapNavbarElement.left}>
        <slot name=${TapNavbarElement.left}>
          <tap-use v-if=${this.back} class="back" role="button" aria-label="back" @click=${this.#backClick} .element=${icons.back}></tap-use>
        </slot>
      </div>
      <div class="center">
        <div class=${classMap({ title: true, small: !!this.subtitle })} part=${TapNavbarElement.title}>
          ${this.title}
        </div>
        <div v-if=${!!this.subtitle} class="subtitle" part=${TapNavbarElement.subtitle}>${this.subtitle}</div>
      </div>
      <div class="right" part=${TapNavbarElement.right}>
        <slot name=${TapNavbarElement.right}></slot>
      </div>
    `;
  };
}
