import { html, GemElement, customElement, emitter, Emitter, attribute } from '../';

export type PanEventDetail = {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  timeStamp: number;
  isPrimary: boolean;
  pointerId: number;
};
export type SwipeEventDetail = { direction: 'top' | 'right' | 'bottom' | 'left' };
export type PinchEventDetail = { x: number; y: number; scale: number };
export type RotateEventDetail = { x: number; y: number; rotate: number };

function angleAB(
  a: number,
  b: number,
  c: number,
  { screenX: x1, screenY: y1 }: PanEventDetail,
  { screenX: x2, screenY: y2 }: PanEventDetail,
  { screenX: x3, screenY: y3 }: PanEventDetail,
) {
  // https://en.wikipedia.org/wiki/Law_of_cosines
  // https://blog.csdn.net/z278930050/article/details/53319091
  return (
    Math.sign((x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2)) * Math.acos((a ** 2 + b ** 2 - c ** 2) / (2 * a * b)) * 180
  );
}

/**
 * 块级元素，如果要设置成 `contents`，则内容块要设置 `touch-action: none`
 * https://javascript.info/pointer-events#event-pointercancel
 *
 * 在移动端上，必须设置 `touch-action` 以允许滚动等原生动作
 *
 * 为什么空白区域会自动触发 `pointercancel`?
 *
 * @customElement gem-gesture
 *
 * @event pan
 * @event pinch
 * @event rotate
 * @event swipe
 * @event press
 * @event end
 *
 * @attr touch-action
 */
@customElement('gem-gesture')
export class GemGestureElement extends GemElement {
  @emitter pan: Emitter<PanEventDetail>;
  @emitter pinch: Emitter<PinchEventDetail>;
  @emitter rotate: Emitter<RotateEventDetail>;
  @emitter swipe: Emitter<SwipeEventDetail>;
  @emitter press: Emitter<null>;
  @emitter end: Emitter<null>;

  @attribute touchAction: string;

  pressed = false; // 触发 press 之后不触发其他事件
  pressTimer = 0;

  startEventMap: Map<number, PointerEvent> = new Map();
  movesMap: Map<number, PanEventDetail[]> = new Map();

  constructor() {
    super();
    this.addEventListener('pointerdown', this.onStart);
    this.addEventListener('pointermove', this.onMove);
    this.addEventListener('pointerup', this.onEnd);
    this.addEventListener('pointercancel', this.onEnd);
    this.addEventListener('dragstart', (evt) => evt.preventDefault());
  }

  getMoves(pointerId: number) {
    return this.movesMap.get(pointerId) || [];
  }

  getStartEvent(pointerId: number) {
    return this.startEventMap.get(pointerId) as PointerEvent;
  }

  getOtherLastmove(pointerId: number) {
    for (const id of this.movesMap.keys()) {
      if (id !== pointerId) {
        const moves = this.getMoves(id);
        return moves[moves.length - 1] || this.getStartEvent(id);
      }
    }
  }

  getMovementX(x: number, y: number) {
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
  }

  getMovementY(x: number, y: number) {
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
  }

  onStart(evt: PointerEvent) {
    this.setPointerCapture(evt.pointerId);
    this.movesMap.set(evt.pointerId, []);
    this.startEventMap.set(evt.pointerId, evt);
    if (evt.isPrimary) {
      this.pressed = false;
      this.pressTimer = window.setTimeout(() => {
        this.press(null);
        this.pressed = true;
      }, 251);
    }
  }

  onMove({ pointerId, screenX, screenY, isPrimary, pointerType, timeStamp }: PointerEvent) {
    if (!this.pressed && this.hasPointerCapture(pointerId)) {
      const moves = this.getMoves(pointerId);
      const startEvent = this.getStartEvent(pointerId);
      const lastMove = moves[moves.length - 1] || startEvent;
      // https://bugs.webkit.org/show_bug.cgi?id=220194
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1092358
      const movementX = screenX - lastMove.screenX;
      const movementY = screenY - lastMove.screenY;
      const move = {
        x: this.getMovementX(movementX, movementY),
        y: this.getMovementY(movementX, movementY),
        screenX,
        screenY,
        timeStamp,
        isPrimary,
        pointerId,
      };
      moves.push(move);
      this.pan(move);

      if (this.movesMap.size !== 1) {
        const secondaryPoint = this.getOtherLastmove(pointerId) as PanEventDetail;
        const moveLen = Math.sqrt(movementX ** 2 + movementY ** 2);
        const distanceLen = Math.sqrt(
          (lastMove.screenX - secondaryPoint.screenX) ** 2 + (lastMove.screenY - secondaryPoint.screenY) ** 2,
        );
        const newDistanceLen = Math.sqrt(
          (screenX - secondaryPoint.screenX) ** 2 + (screenY - secondaryPoint.screenY) ** 2,
        );
        const x = (lastMove.screenX + secondaryPoint.screenX) / 2;
        const y = (lastMove.screenY + secondaryPoint.screenY) / 2;
        this.pinch({ x, y, scale: newDistanceLen / distanceLen });
        this.rotate({ x, y, rotate: angleAB(newDistanceLen, distanceLen, moveLen, secondaryPoint, lastMove, move) });
      }

      const accuracy = pointerType === 'touch' ? 5 : 0;
      if (
        Math.abs(movementX) > accuracy ||
        Math.abs(movementY) > accuracy ||
        Math.abs(move.screenX - startEvent.screenX) > accuracy ||
        Math.abs(move.screenY - startEvent.screenY) > accuracy
      ) {
        window.clearTimeout(this.pressTimer);
      }
    }
  }

  onEnd({ pointerId }: PointerEvent) {
    window.clearTimeout(this.pressTimer);

    if (this.movesMap.size === 1) {
      this.end(null);
    }

    // auto release: https://javascript.info/pointer-events#pointer-capturing
    if (!this.pressed && this.hasPointerCapture(pointerId)) {
      const moves = this.getMoves(pointerId);

      if (moves.length > 2) {
        const { x, y } = moves[moves.length - 1];
        if (Math.abs(x) > 2) {
          if (Math.abs(x) > Math.abs(y)) {
            if (x > 0) {
              this.swipe({ direction: 'right' });
            } else {
              this.swipe({ direction: 'left' });
            }
          }
        }
        if (Math.abs(y) > 2) {
          if (Math.abs(y) > Math.abs(x)) {
            if (y > 0) {
              this.swipe({ direction: 'bottom' });
            } else {
              this.swipe({ direction: 'top' });
            }
          }
        }
      }
    }

    this.movesMap.delete(pointerId);
    this.startEventMap.delete(pointerId);
  }

  render() {
    return html`
      <style>
        :host {
          display: block;
          touch-action: ${this.touchAction || 'none'};
        }
      </style>
      <slot></slot>
    `;
  }
}
