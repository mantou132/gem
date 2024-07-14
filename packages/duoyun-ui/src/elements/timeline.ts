// https://ant.design/components/timeline/
import { adoptedStyle, aria, customElement, property, shadow } from '@mantou/gem/lib/decorators';
import { html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import { DuoyunScrollBaseElement } from './base/scroll';

import './use';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    --size: 1.5em;
    line-height: var(--size);
    display: block;
    overscroll-behavior: auto;
  }
  .item {
    position: relative;
    padding-inline-start: var(--size);
  }
  .line,
  .dot {
    position: absolute;
    content: '';
    left: calc(var(--size) / 4);
  }
  .line {
    top: var(--size);
    bottom: 0;
    transform: translateX(-50%);
    width: 2px;
    background-color: ${theme.borderColor};
  }
  .last {
    display: none;
  }
  .dot {
    top: calc(var(--size) / 2);
    box-sizing: border-box;
    width: calc(var(--size) / 2);
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
  }
  .circle {
    border-radius: 50%;
    color: ${theme.informativeColor};
    border: 2px solid currentColor;
  }
  .desc {
    color: ${theme.describeColor};
    padding-block-end: 0.5em;
  }
`);

type Item = {
  title: string;
  description: string | TemplateResult;
  icon?: string | DocumentFragment | Element;
  color?: string;
};

/**
 * @customElement dy-timeline
 */
@customElement('dy-timeline')
@adoptedStyle(style)
@aria({ role: 'list' })
@shadow()
export class DuoyunTimelineElement extends DuoyunScrollBaseElement {
  @property events?: Item[];

  render = () => {
    const events = this.events;
    if (!events) return html``;

    return html`
      ${events.map(
        ({ title, description, icon, color }, index) => html`
          <div role="listitem" class="item">
            <div class=${classMap({ line: true, last: index === events.length - 1 })}></div>
            <dy-use
              class=${classMap({ dot: true, circle: !icon })}
              style=${styleMap({ color })}
              .element=${icon}
            ></dy-use>
            <div class="title">${title}</div>
            <div class="desc">${description}</div>
          </div>
        `,
      )}
    `;
  };
}
