import type { Emitter } from '../../lib/decorators';
import { adoptedStyle, attribute, emitter, mounted, state } from '../../lib/decorators';
import { css, GemElement } from '../../lib/reactive';

export type PanEventDetail = {
  // movement
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  timeStamp: number;
  isPrimary: boolean;
  pointerId: number;
};
export interface SwipeEventDetail {
  direction: 'top' | 'right' | 'bottom' | 'left';
  speed: number; // px/ms
}
export interface PinchEventDetail {
  // center base viewport
  x: number;
  y: number;
  scale: number;
}
export interface RotateEventDetail {
  // center base viewport
  x: number;
  y: number;
  rotate: number;
}

function angleAB(
  a: number,
  b: number,
  c: number,
  { clientX: x1, clientY: y1 }: PanEventDetail,
  { clientX: x2, clientY: y2 }: PanEventDetail,
  { clientX: x3, clientY: y3 }: PanEventDetail,
) {
  // https://en.wikipedia.org/wiki/Law_of_cosines
  // https://blog.csdn.net/z278930050/article/details/53319091
  return (
    Math.sign((x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2)) * Math.acos((a ** 2 + b ** 2 - c ** 2) / (2 * a * b)) * 180
  );
}

const style = css`
  @layer {
    &:where(:not([hidden])) {
      display: block;
      user-select: none;
      touch-action: attr(touch-action, none);
    }
  }
`;

/**
 * 块级元素，如果要设置成 `contents`，则内容块要设置 `touch-action: none`
 * https://javascript.info/pointer-events#event-pointercancel
 * 在移动端上，必须设置 `touch-action` 以允许滚动等原生动作
 */
@adoptedStyle(style)
export class GemGestureElement extends GemElement {
  @emitter pan: Emitter<PanEventDetail>;
  @emitter pinch: Emitter<PinchEventDetail>;
  @emitter rotate: Emitter<RotateEventDetail>;
  @emitter swipe: Emitter<SwipeEventDetail>;
  @emitter press: Emitter<PointerEvent>;
  @emitter end: Emitter<PointerEvent>;

  @attribute touchAction: string;

  @state grabbing: boolean;

  #pressed = false; // 触发 press 之后不触发其他事件
  #pressTimer: ReturnType<typeof setTimeout> | number = 0;

  #startEventMap: Map<number, PointerEvent> = new Map();

  #getMoves = (pointerId: number) => {
    return this.movesMap.get(pointerId) || [];
  };

  #getStartEvent = (pointerId: number) => {
    return this.#startEventMap.get(pointerId) as PointerEvent;
  };

  #getOtherLastMove = (pointerId: number) => {
    for (const id of this.movesMap.keys()) {
      if (id !== pointerId) {
        const moves = this.#getMoves(id);
        return moves[moves.length - 1] || this.#getStartEvent(id);
      }
    }
  };

  #getMovementX = (x: number, y: number) => {
    const touchAction = this.touchAction;
    if (
      (touchAction.includes('pan-right') && x > 0) ||
      (touchAction.includes('pan-left') && x < 0) ||
      touchAction.includes('pan-x') ||
      (((touchAction.includes('pan-down') && y > 0) ||
        (touchAction.includes('pan-up') && y < 0) ||
        touchAction.includes('pan-y')) &&
        Math.abs(y) > Math.abs(x)) // horizontally scrolling
    ) {
      return 0;
    }
    return x;
  };

  #getMovementY = (x: number, y: number) => {
    const touchAction = this.touchAction;
    if (
      (touchAction.includes('pan-down') && y > 0) ||
      (touchAction.includes('pan-up') && y < 0) ||
      touchAction.includes('pan-y') ||
      (((touchAction.includes('pan-right') && x > 0) ||
        (touchAction.includes('pan-left') && x < 0) ||
        touchAction.includes('pan-x')) &&
        Math.abs(x) > Math.abs(y)) // vertical scrolling
    ) {
      return 0;
    }
    return y;
  };

  #onStart = (evt: PointerEvent) => {
    this.grabbing = true;
    evt.stopPropagation();
    this.setPointerCapture(evt.pointerId);
    this.movesMap.set(evt.pointerId, []);
    this.#startEventMap.set(evt.pointerId, evt);
    if (evt.isPrimary) {
      this.#pressed = false;
      this.#pressTimer = setTimeout(() => {
        this.press(evt);
        this.#pressed = true;
      }, 251);
    }
  };

  #onMove = (evt: PointerEvent) => {
    const { pointerId, clientX, clientY, isPrimary, pointerType, timeStamp } = evt;
    if (!this.#pressed && this.hasPointerCapture(pointerId)) {
      const moves = this.#getMoves(pointerId);
      const startEvent = this.#getStartEvent(pointerId);
      const lastMove = moves[moves.length - 1] || startEvent;
      // Firefox contextmenu after trigger
      if (!lastMove) return;
      // https://bugs.webkit.org/show_bug.cgi?id=220194
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1092358
      const movementX = clientX - lastMove.clientX;
      const movementY = clientY - lastMove.clientY;
      const move = {
        x: this.#getMovementX(movementX, movementY),
        y: this.#getMovementY(movementX, movementY),
        clientX,
        clientY,
        timeStamp,
        isPrimary,
        pointerId,
      };
      moves.push(move);
      this.pan(move);

      if (this.movesMap.size !== 1) {
        const secondaryPoint = this.#getOtherLastMove(pointerId) as PanEventDetail;
        const moveLen = Math.sqrt(movementX ** 2 + movementY ** 2);
        const distanceLen = Math.sqrt(
          (lastMove.clientX - secondaryPoint.clientX) ** 2 + (lastMove.clientY - secondaryPoint.clientY) ** 2,
        );
        const newDistanceLen = Math.sqrt(
          (clientX - secondaryPoint.clientX) ** 2 + (clientY - secondaryPoint.clientY) ** 2,
        );
        const x = (lastMove.clientX + secondaryPoint.clientX) / 2;
        const y = (lastMove.clientY + secondaryPoint.clientY) / 2;
        this.pinch({ x, y, scale: newDistanceLen / distanceLen });
        this.rotate({ x, y, rotate: angleAB(newDistanceLen, distanceLen, moveLen, secondaryPoint, lastMove, move) });
      }

      const accuracy = pointerType === 'touch' ? 5 : 0;
      if (
        Math.abs(movementX) > accuracy ||
        Math.abs(movementY) > accuracy ||
        Math.abs(move.clientX - startEvent.clientX) > accuracy ||
        Math.abs(move.clientY - startEvent.clientY) > accuracy
      ) {
        clearTimeout(this.#pressTimer);
      }
    }
  };

  #onMoveSet = (evt: PointerEvent) => {
    evt.stopPropagation();
    // https://bugs.webkit.org/show_bug.cgi?id=210454
    if ('getCoalescedEvents' in evt) {
      evt.getCoalescedEvents().forEach((event) => this.#onMove(event));
    } else {
      this.#onMove(evt);
    }
  };

  #onEnd = async (evt: PointerEvent) => {
    evt.stopPropagation();
    const { pointerId } = evt;
    clearTimeout(this.#pressTimer);

    if (this.movesMap.size === 1) {
      this.grabbing = false;
      this.end(evt);
    }

    // auto release: https://javascript.info/pointer-events#pointer-capturing
    if (!this.#pressed && this.hasPointerCapture(pointerId)) {
      const moves = this.#getMoves(pointerId);

      if (moves.length > 2) {
        const { x, y, timeStamp, clientX, clientY } = moves[moves.length - 1];
        const move2 = moves[moves.length - 3];
        if (Math.abs(x) > 2) {
          if (Math.abs(x) > Math.abs(y)) {
            const speed = Math.abs(move2.clientX - clientX) / (timeStamp - move2.timeStamp);
            if (x > 0) {
              this.swipe({ direction: 'right', speed });
            } else {
              this.swipe({ direction: 'left', speed });
            }
          }
        }
        if (Math.abs(y) > 2) {
          const speed = Math.abs(move2.clientY - clientY) / (timeStamp - move2.timeStamp);
          if (Math.abs(y) > Math.abs(x)) {
            if (y > 0) {
              this.swipe({ direction: 'bottom', speed });
            } else {
              this.swipe({ direction: 'top', speed });
            }
          }
        }
      }
    }

    this.#startEventMap.delete(pointerId);
    // 确保外部 end 事件处理器中可以读取到
    await Promise.resolve();
    this.movesMap.delete(pointerId);
  };

  #preventDefault = (evt: Event) => evt.preventDefault();

  @mounted()
  #init = () => {
    this.addEventListener('pointerdown', this.#onStart);
    this.addEventListener('pointermove', this.#onMoveSet);
    this.addEventListener('pointerup', this.#onEnd);
    this.addEventListener('pointerleave', this.#onEnd); // 有时候 up 没有触发？
    // 为什么空白区域会自动触发 `pointercancel`?
    this.addEventListener('pointercancel', this.#onEnd);

    this.addEventListener('dragstart', this.#preventDefault);
  };

  /** 一次手势的指针移动事件记录 */
  movesMap: Map<number, PanEventDetail[]> = new Map();
}
