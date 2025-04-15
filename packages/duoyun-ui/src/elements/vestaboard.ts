import { css, html, GemElement, createRef } from '@mantou/gem/lib/element';
import { shadow, effect, attribute, adoptedStyle, customElement, numattribute, part } from '@mantou/gem/lib/decorators';

import { theme } from '../lib/theme';

const style = css`
  :host {
    display: inline-block;
    position: relative;
    color: ${theme.textColor};
    line-height: 1.6;
    width: 1.2em;
    height: 1lh;
    text-align: center;
    transform-style: preserve-3d;
    perspective: 2em;
    cursor: default;
    user-select: none;
  }
  div {
    position: absolute;
    overflow: hidden;
    inset: 0;
    background: ${theme.backgroundColor};
    backface-visibility: hidden;
  }
  .unfoldBottom {
    z-index: 1;
    rotate: x -180deg;
  }
  .foldTop {
    z-index: 2;
  }
  :host([variant='circle']) {
    div {
      mask-composite: intersect;
    }
    .unfoldTop,
    .foldTop {
      mask-image:
        linear-gradient(to bottom, #fff 0%, #fff calc(50% - 0.02em), transparent calc(50% - 0.02em), transparent 100%),
        radial-gradient(circle at 0 50%, transparent 0.1em, #fff 0.1em),
        radial-gradient(circle at 100% 50%, transparent 0.1em, #fff 0.1em);
    }
    .unfoldBottom,
    .foldBottom {
      mask-image:
        linear-gradient(to top, #fff 0%, #fff calc(50% - 0.02em), transparent calc(50% - 0.02em), transparent 100%),
        radial-gradient(circle at 0 50%, transparent 0.1em, #fff 0.1em),
        radial-gradient(circle at 100% 50%, transparent 0.1em, #fff 0.1em);
    }
  }
  :host([variant='polygon']) {
    .before,
    .after {
      content: '';
      position: absolute;
      width: calc(10% - 0.07em);
      height: calc(20% - 0.07em);
      background: ${theme.backgroundColor};
      top: 50%;
      translate: 0 -50%;
    }
    .before {
      left: 0;
    }
    .after {
      right: 0;
    }
    .unfoldTop,
    .foldTop {
      clip-path: polygon(
        0 0,
        100% 0,
        100% 40%,
        calc(90% + 0.025em) 40%,
        calc(90% + 0.025em) 48%,
        calc(10% - 0.025em) 48%,
        calc(10% - 0.025em) 40%,
        0 40%
      );
    }
    .unfoldBottom,
    .foldBottom {
      clip-path: polygon(
        0 60%,
        calc(10% - 0.025em) 60%,
        calc(10% - 0.025em) 52%,
        calc(90% + 0.025em) 52%,
        calc(90% + 0.025em) 60%,
        100% 60%,
        100% 100%,
        0 100%
      );
    }
  }
`;

@customElement('dy-vestaboard')
@adoptedStyle(style)
@shadow()
export class DuoyunVestaboardElement extends GemElement {
  @part static top: string;
  @part static bottom: string;
  @part static before: string;
  @part static after: string;

  @attribute char: string;
  @attribute variant: 'circle' | 'polygon';
  @numattribute duration: number;

  #unfoldTop = createRef<HTMLDivElement>();
  #unfoldBottom = createRef<HTMLDivElement>();
  #foldTop = createRef<HTMLDivElement>();
  #foldBottom = createRef<HTMLDivElement>();

  get #duration() {
    return this.duration || 500;
  }

  #prevChar = '';
  @effect((i) => [i.char])
  #saveChar = () => {
    this.#prevChar = this.char;
  };

  @effect((i) => [i.char])
  #animation = () => {
    const options: EffectTiming = { duration: this.#duration, fill: 'both' };
    this.#unfoldTop.value!.animate({ filter: ['brightness(0.5)', 'brightness(1)', 'brightness(1)'] }, options);
    this.#unfoldBottom.value!.animate({ rotate: ['x 180deg', 'x 0deg'] }, options);
    this.#foldTop.value!.animate({ rotate: ['x 0deg', 'x -180deg'] }, options);
    this.#foldBottom.value!.animate({ filter: ['brightness(1)', 'brightness(1)', 'brightness(0.5)'] }, options);
  };

  render = () => {
    return html`
      <span part=${DuoyunVestaboardElement.before} class="before"></span>
      <div ${this.#unfoldTop} part=${DuoyunVestaboardElement.top} class="unfoldTop">${this.char}</div>
      <div ${this.#unfoldBottom} part=${DuoyunVestaboardElement.bottom} class="unfoldBottom">${this.char}</div>
      <div ${this.#foldTop} part=${DuoyunVestaboardElement.top} class="foldTop">${this.#prevChar}</div>
      <div ${this.#foldBottom} part=${DuoyunVestaboardElement.bottom} class="foldBottom">${this.#prevChar}</div>
      <span part=${DuoyunVestaboardElement.after} class="after"></span>
    `;
  };
}
