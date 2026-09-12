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
  pressed: boolean;
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

// 甩动手感的经验参数，非 UIKit 的公开阈值；坐标单位为 CSS px。
const SWIPE_TIME_WINDOW = 100;
const SWIPE_MIN_SPEED = 0.3; // px/ms
const SWIPE_MIN_DISTANCE = 20;
const SWIPE_DIRECTION_SLOP = 10;

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
  #gestureTriggered = false; // 会排除 touchAction 方向
  #multiTouch = false;
  #pressTimer: ReturnType<typeof setTimeout> | number = 0;

  #startEventMap: Map<number, PointerEvent> = new Map();

  #getMoves = (pointerId: number) => {
    return this.movesMap.get(pointerId) || [];
  };

  #getStartEvent = (pointerId: number) => {
    return this.#startEventMap.get(pointerId) as PointerEvent;
  };

  #getOtherLastMove = (pointerId: number) => {
    for (const id of this.#startEventMap.keys()) {
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
    this.#multiTouch = this.#startEventMap.size > 0;
    this.grabbing = true;
    evt.stopPropagation();
    this.setPointerCapture(evt.pointerId);
    this.movesMap.set(evt.pointerId, []);
    this.#startEventMap.set(evt.pointerId, evt);
    if (evt.isPrimary) {
      this.#pressed = false;
      this.#gestureTriggered = false;
      this.#pressTimer = setTimeout(() => {
        this.press(evt);
        this.#pressed = true;
        this.#gestureTriggered = true;
      }, 251);
    }
  };

  #onMove = (evt: PointerEvent) => {
    const { pointerId, clientX, clientY, isPrimary, pointerType, timeStamp } = evt;
    if (this.hasPointerCapture(pointerId)) {
      const moves = this.#getMoves(pointerId);
      const startEvent = this.#getStartEvent(pointerId);
      if (!startEvent) return;
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
        pressed: this.#pressed,
      };
      moves.push(move);
      this.pan(move);

      if (this.#startEventMap.size !== 1) {
        this.#gestureTriggered = true;
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
      } else if (move.x || move.y) {
        // 经过 touch-action 过滤后仍有位移，说明手势已被本元素认领
        this.#gestureTriggered = true;
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
    const events = 'getCoalescedEvents' in evt ? evt.getCoalescedEvents() : [];
    if (events.length) {
      events.forEach((event) => this.#onMove(event));
    } else {
      this.#onMove(evt);
    }
  };

  #getSwipe = (evt: PointerEvent): SwipeEventDetail | undefined => {
    const startEvent = this.#getStartEvent(evt.pointerId);
    const moves = this.#getMoves(evt.pointerId);
    const targetTime = Math.max(startEvent.timeStamp, evt.timeStamp - SWIPE_TIME_WINDOW);
    let sample: Pick<PanEventDetail, 'clientX' | 'clientY' | 'timeStamp'> = evt;
    let furthest = sample;
    let axis: 'clientX' | 'clientY' | undefined;
    let sign = 0;

    for (let i = moves.length - 1; i >= -1; i--) {
      const previous = i < 0 ? startEvent : moves[i];
      if (previous.timeStamp >= sample.timeStamp) continue;
      // 以抬手时间为窗口终点，插值边界，避免事件采样频率影响速度。
      const timeStamp = Math.max(targetTime, previous.timeStamp);
      const ratio = (timeStamp - previous.timeStamp) / (sample.timeStamp - previous.timeStamp);
      sample = {
        clientX: previous.clientX + (sample.clientX - previous.clientX) * ratio,
        clientY: previous.clientY + (sample.clientY - previous.clientY) * ratio,
        timeStamp,
      };
      const dx = evt.clientX - sample.clientX;
      const dy = evt.clientY - sample.clientY;
      if (!axis && Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_DIRECTION_SLOP) {
        axis = Math.abs(dx) >= Math.abs(dy) ? 'clientX' : 'clientY';
        sign = Math.sign(evt[axis] - sample[axis]);
      }
      if (axis) {
        if ((furthest[axis] - sample[axis]) * sign >= 0) {
          furthest = sample;
        } else if ((sample[axis] - furthest[axis]) * sign >= SWIPE_DIRECTION_SLOP) {
          // 明显回拉时只取最后一段，微抖不改变甩动方向。
          sample = furthest;
          break;
        }
      }
      if (timeStamp <= targetTime) break;
    }

    const duration = evt.timeStamp - sample.timeStamp;
    if (duration <= 0) return;
    const dx = evt.clientX - sample.clientX;
    const dy = evt.clientY - sample.clientY;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    if (Math.abs(dx) === Math.abs(dy)) return;
    const movement = horizontal ? this.#getMovementX(dx, dy) : this.#getMovementY(dx, dy);
    const distance = Math.abs(movement);
    const speed = distance / duration;
    if (distance < SWIPE_MIN_DISTANCE || speed < SWIPE_MIN_SPEED) return;
    const direction = horizontal ? (movement > 0 ? 'right' : 'left') : movement > 0 ? 'bottom' : 'top';
    return { direction, speed };
  };

  #onEnd = async (evt: PointerEvent) => {
    evt.stopPropagation();
    const { pointerId } = evt;
    if (!this.#startEventMap.has(pointerId)) return;
    clearTimeout(this.#pressTimer);

    const moves = this.movesMap.get(pointerId);
    // auto release: https://javascript.info/pointer-events#pointer-capturing
    const swipe =
      evt.type === 'pointerup' &&
      !this.#pressed &&
      !this.#multiTouch &&
      this.hasPointerCapture(pointerId) &&
      this.#getSwipe(evt);
    // end 处理器需要先拿到本次甩动速度，才能决定回弹或继续滑动。
    if (swipe) this.swipe(swipe);

    this.#startEventMap.delete(pointerId);
    const ended = this.#startEventMap.size === 0;
    if (ended) {
      this.grabbing = false;
      this.#gestureTriggered = false;
      this.end(evt);
    }

    // 确保外部 end 事件处理器中可以读取到，且不删除新手势的记录。
    await Promise.resolve();
    if (this.movesMap.get(pointerId) === moves) this.movesMap.delete(pointerId);
  };

  #preventDefault = (evt: Event) => evt.preventDefault();

  #onTouchMove = (evt: TouchEvent) => {
    if (this.#gestureTriggered) evt.preventDefault();
  };

  @mounted()
  #init = () => {
    this.addEventListener('pointerdown', this.#onStart);
    this.addEventListener('pointermove', this.#onMoveSet);
    this.addEventListener('pointerup', this.#onEnd);
    this.addEventListener('pointerleave', this.#onEnd); // 有时候 up 没有触发？
    // 为什么空白区域会自动触发 `pointercancel`?
    this.addEventListener('pointercancel', this.#onEnd);

    this.addEventListener('dragstart', this.#preventDefault);
    this.addEventListener('touchmove', this.#onTouchMove, { passive: false });
  };

  /** 一次手势的指针移动事件记录 */
  movesMap: Map<number, PanEventDetail[]> = new Map();
}
