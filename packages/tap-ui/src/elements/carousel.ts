import { adoptedStyle, attribute, customElement, light, property, template } from '@mantou/gem/lib/decorators';
import { css, GemElement, html, type TemplateResult } from '@mantou/gem/lib/element';

import { blockContainer, focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

// 内容可被外部样式化，类名使用生成的唯一名称，避免被外部同名规则意外命中
const style = css({
  viewport: `
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    gap: 1.25em;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    scrollbar-width: thin;
    scroll-marker-group: after;
    scroll-marker-group: after tabs;
    &::scroll-marker-group {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 2em;
      margin-top: 0.75em;
    }
    @supports selector(::scroll-marker) {
      scrollbar-width: none;
    }
    @media (prefers-reduced-motion: reduce) {
      scroll-behavior: auto;
    }
  `,
  item: `
    min-width: 0;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    &::scroll-marker {
      content: '' / attr(aria-label);
      display: block;
      box-sizing: border-box;
      flex: none;
      width: 1.5rem;
      height: 1.5rem;
      border: 0.5rem solid transparent;
      border-radius: 50%;
      background-color: ${theme.borderColor};
      background-clip: content-box;
      cursor: pointer;
    }
    &::scroll-marker:target-current {
      background-color: ${theme.primaryColor};
    }
    &::scroll-marker:focus-visible {
      outline: 2px solid ${theme.focusColor};
      outline-offset: -2px;
    }
  `,
});

export interface CarouselItem {
  label: string;
  content: TemplateResult | string;
}

@customElement('tap-carousel')
@adoptedStyle(blockContainer)
@adoptedStyle(focusStyle)
@adoptedStyle(style)
@light({ penetrable: true })
export class TapCarouselElement extends GemElement {
  @attribute label: string;
  @property items?: CarouselItem[];

  @template()
  #render = () => html`
    <ol class=${style.viewport} tabindex="0" aria-label=${this.label}>
      ${this.items?.map(
        ({ label, content }) => html`
        <li class=${style.item} aria-label=${label}>${content}</li>
      `,
      )}
    </ol>
  `;
}
