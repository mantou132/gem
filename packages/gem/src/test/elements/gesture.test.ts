import type { EndEventDetail, GemGestureElement, SwipeEventDetail } from '../../elements/gesture';
import { html } from '../../lib/element';
import { aTimeout, expect, fixture } from '../utils';

import '../../elements/gesture';

type Sample = [timeStamp: number, clientX: number, clientY?: number];

function pointer(type: string, [timeStamp, clientX, clientY = 0]: Sample, pointerId = 1) {
  const event = new PointerEvent(type, {
    bubbles: true,
    pointerType: 'touch',
    isPrimary: pointerId === 1,
    pointerId,
    clientX,
    clientY,
  });
  // timeStamp 是只读属性，PointerEventInit 不接受它。
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  return event;
}

async function setupGesture(touchAction = '') {
  const el: GemGestureElement = await fixture(html`<gem-gesture touch-action=${touchAction}></gem-gesture>`);
  const captured = new Set<number>();
  el.setPointerCapture = (id) => captured.add(id);
  el.releasePointerCapture = (id) => captured.delete(id);
  el.hasPointerCapture = (id) => captured.has(id);
  const swipes: SwipeEventDetail[] = [];
  const events: string[] = [];
  el.addEventListener('swipe', (evt: CustomEvent<SwipeEventDetail>) => {
    swipes.push(evt.detail);
    events.push('swipe');
  });
  el.addEventListener('end', () => events.push('end'));
  const dispatch = (type: string, sample: Sample, id = 1) => el.dispatchEvent(pointer(type, sample, id));
  return { el, swipes, events, dispatch };
}

describe('GemGestureElement end', () => {
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    it(`includes the original ${type} event and resets pressed for the next gesture`, async () => {
      const { el, dispatch } = await setupGesture();
      const ends: EndEventDetail[] = [];
      el.addEventListener('end', (evt: CustomEvent<EndEventDetail>) => ends.push(evt.detail));
      const pressed = new Promise((resolve) => el.addEventListener('press', resolve, { once: true }));
      dispatch('pointerdown', [0, 0]);
      await pressed;
      const event = pointer(type, [300, 10, 20]);
      el.dispatchEvent(event);
      await Promise.resolve();
      expect(ends).to.have.lengthOf(1);
      expect(ends[0].event).to.equal(event);
      expect(ends[0].pressed).to.equal(true);

      dispatch('pointerdown', [400, 0]);
      dispatch('pointerup', [450, 0]);
      await Promise.resolve();
      expect(ends).to.have.lengthOf(2);
      expect(ends[1].pressed).to.equal(false);
      expect(ends[0].pressed).to.equal(true);
    });
  }

  it('sets pressed before a press handler synchronously ends the gesture', async () => {
    const { el, dispatch } = await setupGesture();
    const ended = new Promise<EndEventDetail>((resolve) => {
      el.addEventListener('end', (evt: CustomEvent<EndEventDetail>) => resolve(evt.detail), { once: true });
    });
    el.addEventListener('press', () => dispatch('pointerup', [300, 0]), { once: true });
    dispatch('pointerdown', [0, 0]);
    expect((await ended).pressed).to.equal(true);
  });
});

describe('GemGestureElement swipe', () => {
  for (const [direction, x, y] of [
    ['right', 60, 0],
    ['left', -60, 0],
    ['bottom', 0, 60],
    ['top', 0, -60],
  ] as const) {
    it(`emits ${direction} with release speed before end`, async () => {
      const { el, swipes, events, dispatch } = await setupGesture();
      dispatch('pointerdown', [0, 100, 100]);
      dispatch('pointermove', [50, 100 + x, 100 + y]);
      let movesAtEnd = 0;
      el.addEventListener('end', () => {
        movesAtEnd = el.movesMap.get(1)!.length;
        expect(el.grabbing).to.equal(false);
      });
      dispatch('pointerup', [60, 100 + x, 100 + y]);
      await Promise.resolve();
      expect(swipes).to.deep.equal([{ direction, speed: 1 }]);
      expect(events).to.deep.equal(['swipe', 'end']);
      expect(movesAtEnd).to.equal(1);
      await Promise.resolve();
      expect(el.movesMap.size).to.equal(0);
    });
  }

  for (const frequency of [30, 60, 120, 240]) {
    it(`samples the same release velocity at ${frequency} Hz`, async () => {
      const { swipes, dispatch } = await setupGesture();
      dispatch('pointerdown', [0, 0]);
      for (let time = 1000 / frequency; time < 250; time += 1000 / frequency) {
        dispatch('pointermove', [time, time <= 100 ? time * 0.2 : 20 + (time - 100) * 0.8]);
      }
      dispatch('pointerup', [250, 140]);
      await Promise.resolve();
      expect(swipes).to.have.lengthOf(1);
      expect(swipes[0].direction).to.equal('right');
      expect(swipes[0].speed).to.be.closeTo(0.8, 0.000001);
    });
  }

  it('interpolates the window boundary instead of including stale movement', async () => {
    const { swipes, dispatch } = await setupGesture();
    dispatch('pointerdown', [0, 0]);
    dispatch('pointermove', [50, 5]);
    dispatch('pointermove', [150, 105]);
    dispatch('pointerup', [180, 135]);
    await Promise.resolve();
    expect(swipes).to.deep.equal([{ direction: 'right', speed: 1 }]);
  });

  it('includes movement delivered only on pointerup', async () => {
    const { swipes, dispatch } = await setupGesture();
    dispatch('pointerdown', [0, 0]);
    dispatch('pointerup', [50, 50]);
    await Promise.resolve();
    expect(swipes).to.deep.equal([{ direction: 'right', speed: 1 }]);
  });

  it('reduces velocity when the finger pauses briefly before release', async () => {
    const { swipes, dispatch } = await setupGesture();
    dispatch('pointerdown', [0, 0]);
    dispatch('pointermove', [40, 40]);
    dispatch('pointerup', [80, 40]);
    await Promise.resolve();
    expect(swipes).to.deep.equal([{ direction: 'right', speed: 0.5 }]);
  });

  for (const [name, samples] of [
    [
      'slow drag',
      [
        [0, 0],
        [150, 30],
        [180, 35],
      ],
    ],
    [
      'tap jitter',
      [
        [0, 0],
        [10, 8],
        [20, 7],
      ],
    ],
    [
      'paused drag',
      [
        [0, 0],
        [40, 80],
        [140, 80],
      ],
    ],
    [
      'diagonal without a dominant axis',
      [
        [0, 0],
        [40, 40, 40],
        [50, 50, 50],
      ],
    ],
    [
      'zero duration',
      [
        [0, 0],
        [0, 50],
        [0, 80],
      ],
    ],
    [
      'short reversal',
      [
        [0, 0],
        [30, 100],
        [60, 85],
      ],
    ],
  ] satisfies [string, Sample[]][]) {
    it(`does not swipe on ${name}`, async () => {
      const { swipes, dispatch } = await setupGesture();
      dispatch('pointerdown', samples[0]);
      dispatch('pointermove', samples[1]);
      dispatch('pointerup', samples[2]);
      await Promise.resolve();
      expect(swipes).to.deep.equal([]);
    });
  }

  it('uses the final flick direction after reversing a drag', async () => {
    const { swipes, dispatch } = await setupGesture();
    dispatch('pointerdown', [0, 0]);
    dispatch('pointermove', [40, 100]);
    dispatch('pointermove', [60, 80]);
    dispatch('pointerup', [80, 60]);
    await Promise.resolve();
    expect(swipes).to.deep.equal([{ direction: 'left', speed: 1 }]);
  });

  it('ignores a small backwards jitter at release', async () => {
    const { swipes, dispatch } = await setupGesture();
    dispatch('pointerdown', [0, 0]);
    dispatch('pointermove', [50, 60]);
    dispatch('pointerup', [60, 58]);
    await Promise.resolve();
    expect(swipes).to.have.lengthOf(1);
    expect(swipes[0].direction).to.equal('right');
    expect(swipes[0].speed).to.be.closeTo(58 / 60, 0.000001);
  });

  for (const [touchAction, x, y] of [
    ['pan-x', 50, 0],
    ['pan-y', 0, 50],
    ['pan-right', 50, 0],
    ['pan-left', -50, 0],
    ['pan-down', 0, 50],
    ['pan-up', 0, -50],
  ] as const) {
    it(`respects touch-action=${touchAction}`, async () => {
      const { swipes, dispatch } = await setupGesture(touchAction);
      dispatch('pointerdown', [0, 0]);
      dispatch('pointermove', [40, x, y]);
      dispatch('pointerup', [50, x, y]);
      await Promise.resolve();
      expect(swipes).to.deep.equal([]);
    });
  }

  it('allows horizontal flicks with touch-action=pan-y', async () => {
    const { swipes, dispatch } = await setupGesture('pan-y');
    dispatch('pointerdown', [0, 0]);
    dispatch('pointermove', [40, 50, 2]);
    dispatch('pointerup', [50, 50, 2]);
    await Promise.resolve();
    expect(swipes).to.deep.equal([{ direction: 'right', speed: 1 }]);
  });

  for (const type of ['pointercancel', 'pointerleave']) {
    it(`does not swipe on ${type} or duplicate end events`, async () => {
      const { swipes, events, dispatch } = await setupGesture();
      dispatch('pointerdown', [0, 0]);
      dispatch('pointermove', [40, 50]);
      dispatch(type, [50, 50]);
      dispatch('pointerup', [50, 50]);
      await Promise.resolve();
      expect(swipes).to.deep.equal([]);
      expect(events).to.deep.equal(['end']);
    });
  }

  it('ignores end events from pointers outside the gesture', async () => {
    const { el, events, dispatch } = await setupGesture();
    dispatch('pointerdown', [0, 0]);
    dispatch('pointerleave', [10, 0], 2);
    expect(events).to.deep.equal([]);
    expect(el.grabbing).to.equal(true);
    dispatch('pointercancel', [20, 0]);
  });

  it('does not swipe after losing pointer capture', async () => {
    const { el, swipes, dispatch } = await setupGesture();
    dispatch('pointerdown', [0, 0]);
    dispatch('pointermove', [40, 50]);
    el.releasePointerCapture(1);
    dispatch('pointerup', [50, 50]);
    await Promise.resolve();
    expect(swipes).to.deep.equal([]);
  });

  it('suppresses both fingers of a multitouch gesture and resets for the next gesture', async () => {
    const { el, swipes, events, dispatch } = await setupGesture();
    dispatch('pointerdown', [0, 0]);
    dispatch('pointerdown', [10, 100], 2);
    dispatch('pointermove', [30, 30]);
    dispatch('pointerup', [40, 40]);
    await Promise.resolve();
    expect(el.grabbing).to.equal(true);
    expect(events).to.deep.equal([]);
    await Promise.resolve();
    dispatch('pointermove', [60, 150], 2);
    dispatch('pointerup', [80, 170], 2);
    await Promise.resolve();
    expect(swipes).to.deep.equal([]);
    expect(events).to.deep.equal(['end']);
    dispatch('pointerdown', [100, 0]);
    dispatch('pointermove', [140, 50]);
    dispatch('pointerup', [150, 50]);
    await Promise.resolve();
    expect(swipes).to.deep.equal([{ direction: 'right', speed: 1 }]);
  });

  it('does not swipe after a long press', async () => {
    const { el, swipes, dispatch } = await setupGesture();
    const pressed = new Promise((resolve) => el.addEventListener('press', resolve, { once: true }));
    dispatch('pointerdown', [0, 0]);
    await pressed;
    dispatch('pointermove', [300, 0]);
    dispatch('pointermove', [340, 60]);
    dispatch('pointerup', [350, 60]);
    await Promise.resolve();
    expect(swipes).to.deep.equal([]);
  });

  it('handles coalesced samples and the empty-list fallback', async () => {
    const { el, swipes, dispatch } = await setupGesture();
    dispatch('pointerdown', [0, 0]);
    const coalesced = pointer('pointermove', [50, 50]);
    Object.defineProperty(coalesced, 'getCoalescedEvents', {
      value: () => [pointer('pointermove', [25, 25]), pointer('pointermove', [50, 50])],
    });
    el.dispatchEvent(coalesced);
    const empty = pointer('pointermove', [75, 75]);
    Object.defineProperty(empty, 'getCoalescedEvents', { value: () => [] });
    el.dispatchEvent(empty);
    expect(el.movesMap.get(1)).to.have.lengthOf(3);
    dispatch('pointerup', [100, 100]);
    await Promise.resolve();
    expect(swipes).to.deep.equal([{ direction: 'right', speed: 1 }]);
  });

  it('preserves a new gesture started by an end handler', async () => {
    const { el, dispatch } = await setupGesture();
    el.addEventListener('end', () => dispatch('pointerdown', [100, 0]), { once: true });
    dispatch('pointerdown', [0, 0]);
    dispatch('pointermove', [40, 50]);
    dispatch('pointerup', [50, 50]);
    await Promise.resolve();
    await aTimeout();
    expect(el.grabbing).to.equal(true);
    expect(el.movesMap.has(1)).to.equal(true);
    dispatch('pointercancel', [110, 0]);
  });
});
