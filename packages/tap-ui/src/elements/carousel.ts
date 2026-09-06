import { adoptedStyle, attribute, customElement, property, template } from '@mantou/gem/lib/decorators';
import { css, GemElement, html, type TemplateResult } from '@mantou/gem/lib/element';

import { blockContainer, focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

const style = css`
  .viewport {
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
  }

  .item {
    min-width: 0;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }

  .viewport::scroll-marker-group {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2em;
    margin-top: 0.75em;
  }

  .item::scroll-marker {
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

  .item::scroll-marker:target-current {
    background-color: ${theme.primaryColor};
  }

  .item::scroll-marker:focus-visible {
    outline: 2px solid ${theme.focusColor};
    outline-offset: -2px;
  }

  @supports selector(::scroll-marker) {
    .viewport { scrollbar-width: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .viewport { scroll-behavior: auto; }
  }
`;

export interface CarouselItem {
  label: string;
  content: TemplateResult | string;
}

@customElement('tap-carousel')
@adoptedStyle(blockContainer)
@adoptedStyle(focusStyle)
@adoptedStyle(style)
export class TapCarouselElement extends GemElement {
  @attribute label: string;
  @property items?: CarouselItem[];

  @template()
  #render = () => html`
    <ol class="viewport" tabindex="0" aria-label=${this.label}>
      ${this.items?.map(
        ({ label, content }) => html`
        <li class="item" aria-label=${label}>${content}</li>
      `,
      )}
    </ol>
  `;
}
