import {
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  Emitter,
  property,
  boolattribute,
  refobject,
  RefObject,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, StyleObject } from '@mantou/gem/lib/utils';

import { sleep, setBodyInert } from '../lib/utils';
import { theme } from '../lib/theme';

import '@mantou/gem/elements/reflect';

const style = createCSSSheet(css`
  :host {
    display: contents;
  }
`);

export type PopoverState = {
  open: boolean;
  left: number;
  right: number;
  top: number;
  bottom: number;
  style: StyleObject;
  position: Position;
};

// TODO: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
type Position = 'top' | 'bottom' | 'right' | 'left';

const getAssignedElements = (ele: HTMLSlotElement): Element[] => {
  const es = ele!.assignedElements();
  if (es[0] instanceof HTMLSlotElement) {
    return getAssignedElements(es[0]);
  }
  return es;
};

const getBoundingClientRect = (eles: Element[]) => {
  const rects = eles.map((e) => e.getBoundingClientRect());
  return {
    top: Math.min(...rects.map((e) => e.top)),
    left: Math.min(...rects.map((e) => e.left)),
    right: Math.max(...rects.map((e) => e.right)),
    bottom: Math.max(...rects.map((e) => e.bottom)),
  };
};

type GhostStyle = {
  '--bg': string;
  '--color': string;
};

type Option = {
  delay?: number;
  content?: string | TemplateResult;
  position?: Position;
  ghostStyle?: GhostStyle;
  // `click` close
  trigger?: 'click' | 'hover';
};

/**
 * @customElement dy-popover
 * @attr debug
 * @attr position
 * @attr trigger
 */
@customElement('dy-popover')
@adoptedStyle(style)
export class DuoyunPopoverElement extends GemElement<PopoverState> {
  @boolattribute debug: boolean;
  @attribute trigger: 'click' | 'hover';
  @attribute position: Position | 'auto';

  @property content?: string | TemplateResult;

  @refobject wrapRef: RefObject<HTMLDivElement>;
  @refobject slotRef: RefObject<HTMLSlotElement>;
  @emitter open: Emitter<null>;
  @emitter close: Emitter<null>;

  static show = (x: number, y: number, option: Option) => {
    const popover = new DuoyunPopoverElement(option);
    const restoreInert = option.trigger === 'click' ? setBodyInert(popover) : undefined;
    document.body.append(popover);
    popover.#open({ left: x, right: x, top: y, bottom: y });
    // handle mask click
    popover.addEventListener('close', () => {
      restoreInert?.();
      popover.remove();
    });
    return () => {
      restoreInert?.();
      popover.close(null);
      popover.remove();
    };
  };

  ghostStyle: GhostStyle = {
    '--bg': theme.backgroundColor,
    '--color': theme.highlightColor,
  };

  get #position() {
    return this.position || 'auto';
  }

  get #trigger() {
    return this.trigger || 'hover';
  }

  state: PopoverState = {
    open: false,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    style: {},
    position: 'top',
  };

  constructor({ delay = 500, content, position, ghostStyle, trigger }: Option = {}) {
    super();
    if (content) this.content = content;
    if (position) this.position = position;
    if (ghostStyle) this.ghostStyle = ghostStyle;
    if (trigger) this.trigger = trigger;
    this.addEventListener('mouseover', async () => {
      if (this.#trigger === 'click') return;
      this.#hover = true;
      await sleep(delay);
      if (!this.content) return;
      if (!this.#hover) return;
      this.#open();
    });

    this.addEventListener('mouseout', () => {
      if (this.#trigger === 'click') return;
      this.#close();
    });

    this.addEventListener('click', () => {
      if (this.#trigger === 'hover') return;
      this.#open();
    });
  }

  #hover = false;

  #open = (targetRect?: { top: number; right: number; bottom: number; left: number }) => {
    if (this.state.open) return;
    let rect = targetRect;
    if (!rect) {
      let eles = getAssignedElements(this.slotRef.element!);
      if (!eles.length) {
        eles = [this];
        this.style.display = 'inline';
      } else {
        this.removeAttribute('style');
      }
      rect = getBoundingClientRect(eles);
    }
    this.open(null);
    const { top, right, bottom, left } = rect;
    this.setState({
      open: true,
      top,
      left,
      right,
      bottom,
    });
    const position = this.#position === 'auto' ? 'top' : this.#position;
    this.setState({
      position,
      style: this.#genStyle(position),
    });
  };

  #close = () => {
    this.close(null);
    this.setState({ open: this.debug || false });
    this.#hover = false;
  };

  #genStyle = (position: Position): StyleObject => {
    const { top, left, right, bottom } = this.state;
    const offset = 12;
    switch (position) {
      case 'top':
        return {
          left: `${left + (right - left) / 2}px`,
          bottom: `${innerHeight - top + offset}px`,
          transform: `translateX(-50%)`,
        };
      case 'bottom':
        return {
          left: `${left + (right - left) / 2}px`,
          top: `${bottom + offset}px`,
          transform: `translateX(-50%)`,
        };
      case 'left':
        return {
          right: `${innerWidth - left + offset}px`,
          top: `${top + (bottom - top) / 2}px`,
          transform: `translateY(-50%)`,
        };
      case 'right':
        return {
          left: `${right + offset}px`,
          top: `${top + (bottom - top) / 2}px`,
          transform: `translateY(-50%)`,
        };
    }
  };

  mounted = () => {
    this.effect(
      () => {
        if (this.state.open && this.#position === 'auto') {
          const { top, left, right } = this.wrapRef.element!.getBoundingClientRect();
          let position: Position = 'top';
          if (right > innerWidth) {
            position = 'left';
          } else if (top < 0) {
            position = 'bottom';
          } else if (left < 0) {
            position = 'right';
          }
          this.setState({ style: this.#genStyle(position), position });
        }
      },
      () => [this.state.open],
    );
  };

  render = () => {
    const { open, style, position } = this.state;
    return html`
      ${open
        ? html`
            <gem-reflect .target=${document.body}>
              <div
                style=${styleMap({
                  display: this.trigger === 'click' ? 'block' : 'none',
                  position: 'absolute',
                  inset: '0',
                })}
                @click=${this.#close}
              ></div>
              <dy-popover-ghost
                role=${this.tagName.includes('TOOLTIP') ? 'tooltip' : 'region'}
                ref=${this.wrapRef.ref}
                data-position=${position}
                style=${`${styleMap(style)}${styleMap(this.ghostStyle)}`}
              >
                ${this.content}
              </dy-popover-ghost>
            </gem-reflect>
          `
        : ''}
      <slot ref=${this.slotRef.ref}></slot>
    `;
  };
}

export const Popover = DuoyunPopoverElement;

const ghostStyle = createCSSSheet(css`
  :host {
    position: fixed;
    z-index: 9999999;
    background-color: var(--bg);
    color: var(--color);
    line-height: 1.5;
    padding: 0.6em 1em;
    border-radius: ${theme.normalRound};
    font-size: 0.875em;
    hyphens: auto;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    filter: drop-shadow(rgba(0, 0, 0, calc(${theme.maskAlpha})) 0px 0.6em 1em);
  }
  :host::before {
    content: '';
    position: absolute;
    border-style: solid;
  }
  :host([data-position='top'])::before {
    top: 100%;
    left: 50%;
    border-color: var(--bg) transparent transparent transparent;
    border-width: 6px 6px 0 6px;
    transform: translateX(-50%);
  }
  :host([data-position='bottom'])::before {
    bottom: 100%;
    left: 50%;
    border-color: transparent transparent var(--bg) transparent;
    border-width: 0 6px 6px 6px;
    transform: translateX(-50%);
  }
  :host([data-position='left'])::before {
    top: 50%;
    left: 100%;
    border-color: transparent transparent transparent var(--bg);
    border-width: 6px 0 6px 6px;
    transform: translateY(-50%);
  }
  :host([data-position='right'])::before {
    top: 50%;
    right: 100%;
    border-color: transparent var(--bg) transparent transparent;
    border-width: 6px 6px 6px 0;
    transform: translateY(-50%);
  }
`);

/**
 * @customElement dy-popover-ghost
 */
@customElement('dy-popover-ghost')
@adoptedStyle(ghostStyle)
export class DuoyunPopoverGhostElement extends GemElement {}
