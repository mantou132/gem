import type { ElementPart, PartInfo } from '@mantou/gem/lib/directive';
import { Directive, directive, PartType } from '@mantou/gem/lib/directive';

export type RepeatPressAction = () => boolean | void | unknown;

export interface RepeatPressOptions {
  /** 首次长按等待时间，默认 350ms */
  delay?: number;
  /** 连发间隔时间，默认 100ms */
  interval?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 触发的鼠标按键，默认 0（左键） */
  button?: number;
}

class RepeatPressDirective extends Directive {
  #element?: Element;
  #action?: RepeatPressAction;
  #options?: RepeatPressOptions;

  #repeatTimer = 0;
  #intervalTimer = 0;

  constructor(partInfo: PartInfo) {
    super();
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error('repeatPress can only be used on elements');
    }
  }

  #stop = () => {
    window.clearTimeout(this.#repeatTimer);
    window.clearInterval(this.#intervalTimer);
  };

  #start = (evt: PointerEvent) => {
    if (evt.button !== (this.#options?.button ?? 0) || this.#options?.disabled) return;
    this.#stop();

    if (this.#action?.() === false) return;

    const delay = this.#options?.delay ?? 350;
    const interval = this.#options?.interval ?? 100;

    this.#repeatTimer = window.setTimeout(() => {
      this.#intervalTimer = window.setInterval(() => {
        if (this.#options?.disabled || this.#action?.() === false) {
          this.#stop();
        }
      }, interval);
    }, delay);

    try {
      this.#element?.setPointerCapture(evt.pointerId);
    } catch {
      // In case setPointerCapture fails (e.g. detached or unsupported)
    }
  };

  #onClick = (evt: MouseEvent) => {
    // Keyboard activation (Enter/Space on focused button) triggers click with detail === 0
    if (evt.detail === 0 && !this.#options?.disabled) {
      this.#action?.();
    }
  };

  _$notifyDirectiveConnectionChanged(isConnected: boolean) {
    if (!isConnected) {
      this.#stop();
    }
  }

  update(part: ElementPart, [action, options]: [RepeatPressAction, RepeatPressOptions?]) {
    this.#action = action;
    this.#options = options;

    if (options?.disabled) {
      this.#stop();
    }

    if (this.#element !== part.element) {
      if (this.#element) {
        this.#element.removeEventListener('pointerdown', this.#start as EventListener);
        this.#element.removeEventListener('lostpointercapture', this.#stop);
        this.#element.removeEventListener('pointercancel', this.#stop);
        this.#element.removeEventListener('pointerup', this.#stop);
        this.#element.removeEventListener('click', this.#onClick as EventListener);
      }
      this.#element = part.element;
      this.#element.addEventListener('pointerdown', this.#start as EventListener);
      this.#element.addEventListener('lostpointercapture', this.#stop);
      this.#element.addEventListener('pointercancel', this.#stop);
      this.#element.addEventListener('pointerup', this.#stop);
      this.#element.addEventListener('click', this.#onClick as EventListener);
    }

    return this.render(action, options);
  }

  render(_action: RepeatPressAction, _options?: RepeatPressOptions) {
    return undefined;
  }
}

/**
 * 长按连续触发指令
 * - 按下第一下立即触发 `action`
 * - 持续按住超过 `delay`（默认 350ms）后，以 `interval`（默认 100ms）间隔连发
 * - 松开、取消、失去焦点或 `action` 返回 `false` 时停止
 * - 支持键盘（Space/Enter）无障碍激活（通过 click detail === 0）
 */
export const repeatPress = directive(RepeatPressDirective);
