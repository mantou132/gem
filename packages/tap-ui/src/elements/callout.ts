import {
  adoptedStyle,
  customElement,
  effect,
  mounted,
  part,
  property,
  shadow,
  slot,
  state,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html, type TemplateResult } from '@mantou/gem/lib/element';
import { addListener, classMap, styleMap } from '@mantou/gem/lib/utils';

import { longPress } from '../lib/directives';
import { clamp } from '../lib/number';
import { theme, themeStore } from '../lib/theme';

import './options';

const DURATION = 300;
const DURATION_CLOSE = 200;
const LIFT_SCALE = 1.03;
/** 预览和菜单的间距 */
const GAP = 8;

const style = css`
  :host(:not([hidden])) {
    display: block;
  }
  .content {
    transform-origin: center;
    /* 长按留给菜单，屏蔽 iOS 系统菜单和选词 */
    -webkit-touch-callout: none;
    user-select: none;
  }
  /* 浮起时和 .layer 都是 popover，进入 top layer 不受祖先层叠上下文、transform 和 overflow 影响 */
  :is(.content.lifted, .layer) {
    margin: 0;
    padding: 0;
    border: 0;
    overflow: visible;
    background: none;
    color: inherit;
  }
  .content.lifted {
    inset: auto;
  }
  .layer {
    inset: 0;
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
  }
  .mask {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, ${theme.maskAlpha});
    backdrop-filter: blur(16px);
    touch-action: none;
  }
  .body {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    padding: 12px;
    padding-block-start: calc(12px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)));
    padding-block-end: calc(12px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
    pointer-events: none;
    > * {
      pointer-events: auto;
    }
  }
  .preview {
    position: absolute;
    box-sizing: border-box;
    overflow: auto;
    transform-origin: center;
    border-radius: calc(${theme.normalRound} * 3);
    background: ${theme.backgroundColor};
  }
  .menu {
    position: absolute;
    width: 15em;
    font-size: 1em;
    border-radius: calc(${theme.normalRound} * 3);
    box-shadow: 0 7px 14px rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1));
  }
`;

export interface CalloutItem {
  label: string | TemplateResult;
  icon?: string | DocumentFragment | Element;
  danger?: boolean;
  disabled?: boolean;
  handle?: () => void;
}

export interface CalloutOptions {
  /** 被长按的元素，预览从它的位置展开 */
  target: Element;
  preview: TemplateResult;
  menu: CalloutItem[];
}

/** 坐标相对于 `.body`，即视口 */
type Layout = {
  top: number;
  left: number;
  width: number;
  height: number;
  scale: number;
  menuTop: number;
  menuLeft: number;
  alignStart: boolean;
};

/**
 * 长按内容原地浮起，下方显示菜单
 *
 * 使用 `Callout.open` 在长按元素的位置展示预览内容和菜单
 */
@customElement('tap-callout')
@adoptedStyle(style)
@shadow()
export class TapCalloutElement extends GemElement {
  @slot static unnamed: string;
  @part static preview: string;
  @part static menu: string;

  @property menu?: CalloutItem[];

  @state open: boolean;

  static open({ target, preview, menu }: CalloutOptions) {
    const callout = new TapCalloutElement();
    callout.#target = target;
    callout.#preview = preview;
    callout.menu = menu;
    document.body.append(callout);
    return new Promise<void>((resolve) => (callout.#onClosed = resolve));
  }

  #target?: Element;
  #preview?: TemplateResult;
  #onClosed?: () => void;
  #contentRef = createRef<HTMLElement>();
  #layerRef = createRef<HTMLElement>();
  #maskRef = createRef<HTMLElement>();
  #bodyRef = createRef<HTMLElement>();
  #previewRef = createRef<HTMLElement>();
  #menuRef = createRef<HTMLElement>();
  #state = createState({
    rect: new DOMRect(),
    lifted: false,
    layout: undefined as Layout | undefined,
  });
  #closing = false;

  #lift = () => {
    if (this.open || !this.menu?.length) return;
    const content = this.#contentRef.value!;
    const rect = content.getBoundingClientRect();
    this.open = true;
    // 后打开的在上面
    this.#layerRef.value!.showPopover();
    content.popover = 'manual';
    content.showPopover();
    this.#state({ rect, lifted: true, layout: undefined });
  };

  #close = async () => {
    if (!this.open || this.#closing) return;
    this.#closing = true;
    const animations = this.#animate(true);
    await Promise.all(animations.map((animation) => animation.finished));
    if (this.#preview) {
      this.remove();
      this.#onClosed?.();
      return;
    }
    const content = this.#contentRef.value!;
    content.hidePopover();
    content.popover = null;
    this.#layerRef.value!.hidePopover();
    this.open = false;
    this.#state({ lifted: false, layout: undefined });
    animations.forEach((animation) => animation.cancel());
    this.#closing = false;
  };

  // 关闭后再执行，避免操作打开的弹层被 top layer 盖住
  #onSelect = async ({ handle }: CalloutItem) => {
    await this.#close();
    handle?.();
  };

  /** 以长按元素为中心放置浮起内容或预览，放不下时移动或缩小，菜单在下方 */
  #calcLayout = (): Layout => {
    const { rect, lifted } = this.#state;
    const body = this.#bodyRef.value!;
    const menu = this.#menuRef.value!;
    const bodyRect = body.getBoundingClientRect();
    const bodyStyle = getComputedStyle(body);
    const boxTop = parseFloat(bodyStyle.paddingBlockStart);
    const boxBottom = bodyRect.height - parseFloat(bodyStyle.paddingBlockEnd);
    const boxLeft = parseFloat(bodyStyle.paddingInlineStart);
    const boxRight = bodyRect.width - parseFloat(bodyStyle.paddingInlineEnd);
    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menu;
    const maxHeight = boxBottom - boxTop - menuHeight - GAP;
    let { width, height } = rect;
    let scale = Math.min(LIFT_SCALE, maxHeight / height);
    if (!lifted) {
      // 预览保持原尺寸，超出时限制宽高并滚动
      const preview = this.#previewRef.value!;
      width = Math.min(preview.offsetWidth, boxRight - boxLeft);
      height = Math.min(preview.offsetHeight, maxHeight);
      scale = 1;
    }
    const visualWidth = width * scale;
    const visualHeight = height * scale;
    const centerX = rect.left - bodyRect.left + rect.width / 2;
    const centerY = rect.top - bodyRect.top + rect.height / 2;
    const visualLeft = clamp(boxLeft, centerX - visualWidth / 2, boxRight - visualWidth);
    const visualTop = clamp(boxTop, centerY - visualHeight / 2, boxBottom - menuHeight - GAP - visualHeight);
    // 菜单和内容靠同一侧对齐
    const alignStart = centerX < bodyRect.width / 2;
    return {
      top: visualTop - (height - visualHeight) / 2,
      left: visualLeft - (width - visualWidth) / 2,
      width,
      height,
      scale,
      menuTop: visualTop + visualHeight + GAP,
      menuLeft: clamp(boxLeft, alignStart ? visualLeft : visualLeft + visualWidth - menuWidth, boxRight - menuWidth),
      alignStart,
    };
  };

  #animate = (reverse = false) => {
    const { rect, lifted, layout } = this.#state;
    const options: KeyframeAnimationOptions = {
      duration: reverse ? DURATION_CLOSE : DURATION,
      easing: themeStore.timingFunction,
      // 关闭时保持结束状态直到隐藏
      fill: reverse ? 'forwards' : 'none',
      direction: reverse ? 'reverse' : 'normal',
    };
    const { left, top, width, height, scale, alignStart } = layout!;
    const bodyRect = this.#bodyRef.value!.getBoundingClientRect();
    // 从长按元素的位置展开
    const offsetX = rect.left - bodyRect.left + rect.width / 2 - (left + width / 2);
    const offsetY = rect.top - bodyRect.top + rect.height / 2 - (top + height / 2);
    const menu = this.#menuRef.value!;
    menu.style.transformOrigin = `top ${alignStart ? 'left' : 'right'}`;
    return [
      this.#maskRef.value!.animate([{ opacity: 0 }, { opacity: 1 }], options),
      menu.animate(
        [
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1 },
        ],
        options,
      ),
      (lifted ? this.#contentRef : this.#previewRef).value!.animate(
        [
          {
            translate: `${offsetX}px ${offsetY}px`,
            scale: lifted ? 1 : Math.min(rect.width / width, rect.height / height),
            opacity: lifted ? 1 : 0,
          },
          { translate: '0 0', scale, opacity: 1 },
        ],
        options,
      ),
    ];
  };

  @effect((i) => [i.#state.layout, i.open])
  #enter = () => {
    if (!this.open) return;
    if (!this.#state.layout) {
      this.#state({ layout: this.#calcLayout() });
      return;
    }
    this.#animate();
  };

  @effect((i) => [i.open])
  #closeWatcher = () => {
    if (!this.open || typeof CloseWatcher === 'undefined') return;
    const watcher = new CloseWatcher();
    watcher.addEventListener('close', this.#close);
    return () => watcher.destroy();
  };

  @mounted()
  #init = () => {
    if (this.#preview) {
      this.#layerRef.value!.showPopover();
      this.open = true;
      this.#state({ rect: this.#target!.getBoundingClientRect() });
      return;
    }
    // 长按松开后会触发内容的点击，打开期间拦截
    return addListener(
      this.#contentRef.value!,
      'click',
      (evt: Event) => {
        if (!this.open) return;
        evt.stopPropagation();
        evt.preventDefault();
      },
      { capture: true },
    );
  };

  render = () => {
    const { rect, lifted, layout } = this.#state;
    const position = layout
      ? styleMap({
          top: `${layout.top}px`,
          left: `${layout.left}px`,
          width: `${layout.width}px`,
          height: `${layout.height}px`,
          scale: `${layout.scale}`,
        })
      : undefined;
    return html`
      <div
        v-if=${lifted}
        style=${styleMap({ width: `${rect.width}px`, height: `${rect.height}px` })}
      ></div>
      <div
        v-if=${!this.#preview}
        ${this.#contentRef}
        ${longPress(this.#lift, { disabled: !this.menu?.length })}
        class=${classMap({ content: true, lifted })}
        style=${lifted ? position : undefined}
      >
        <slot></slot>
      </div>
      <div ${this.#layerRef} class="layer" popover="manual">
        <div ${this.#maskRef} class="mask" @click=${this.#close}></div>
        <div ${this.#bodyRef} class="body">
          <div
            v-if=${!!this.#preview}
            ${this.#previewRef}
            class="preview"
            part=${TapCalloutElement.preview}
            style=${position}
          >
            ${this.#preview}
          </div>
          <tap-options
            ${this.#menuRef}
            class="menu"
            part=${TapCalloutElement.menu}
            style=${layout ? styleMap({ top: `${layout.menuTop}px`, left: `${layout.menuLeft}px` }) : undefined}
            .options=${this.menu?.map((item) => ({
              label: item.label,
              tagIcon: item.icon,
              danger: item.danger,
              disabled: item.disabled,
              onClick: item.disabled ? undefined : () => this.#onSelect(item),
            }))}
          ></tap-options>
        </div>
      </div>
    `;
  };
}

export const Callout = TapCalloutElement;
