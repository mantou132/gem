import { html, render } from '@mantou/gem/lib/element';
import { createFakeTimers, expect } from '@mantou/gem/test/utils';

import { longPress, repeatPress } from './directives';

let clock: ReturnType<typeof createFakeTimers>;

beforeEach(() => {
  clock = createFakeTimers();
  clock.install();
});

afterEach(() => {
  clock.uninstall();
});

it('`repeatPress` basic immediate click and pointerdown', () => {
  let count = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  render(html`<button ${repeatPress(() => count++, { delay: 50, interval: 20 })}></button>`, container);

  const btn = container.querySelector('button')!;

  // Pointerdown triggers immediately
  btn.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  expect(count).to.equal(1);

  // No repeat before delay, first repeat one interval after delay
  clock.tick(49);
  expect(count).to.equal(1);
  clock.tick(1);
  expect(count).to.equal(1);
  clock.tick(19);
  expect(count).to.equal(1);
  clock.tick(1);
  expect(count).to.equal(2);

  // Repeat every interval
  clock.tick(20);
  expect(count).to.equal(3);
  clock.tick(20);
  expect(count).to.equal(4);

  // Stop repeat
  btn.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 }));
  clock.tick(1000);
  expect(count).to.equal(4);

  // Keyboard activation (detail === 0)
  btn.dispatchEvent(new MouseEvent('click', { detail: 0 }));
  expect(count).to.equal(5);

  // Mouse click (detail > 0) should not double trigger
  btn.dispatchEvent(new MouseEvent('click', { detail: 1 }));
  expect(count).to.equal(5);

  container.remove();
});

it('`repeatPress` with disabled option', () => {
  let count = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  render(html`<button ${repeatPress(() => count++, { disabled: true })}></button>`, container);

  const btn = container.querySelector('button')!;
  btn.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  btn.dispatchEvent(new MouseEvent('click', { detail: 0 }));
  clock.tick(1000);
  expect(count).to.equal(0);

  container.remove();
});

it('`repeatPress` stops when action returns false', () => {
  let count = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  render(
    html`<button
      ${repeatPress(
        () => {
          count++;
          return count < 3;
        },
        { delay: 40, interval: 20 },
      )}
    ></button>`,
    container,
  );

  const btn = container.querySelector('button')!;
  btn.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  expect(count).to.equal(1);

  clock.tick(40);
  expect(count).to.equal(1);
  clock.tick(20);
  expect(count).to.equal(2);
  clock.tick(20);
  expect(count).to.equal(3);

  // Stops when action returns false
  clock.tick(1000);
  expect(count).to.equal(3);

  container.remove();
});

it('`longPress` fires after delay and calls release on pointerup', () => {
  let count = 0;
  let released = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  render(html`<div ${longPress(() => count++, { delay: 40, release: () => released++ })}></div>`, container);

  const el = container.querySelector('div')!;

  // Short press does not fire
  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  clock.tick(39);
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
  clock.tick(1000);
  expect(count).to.equal(0);
  expect(released).to.equal(0);

  // Long press fires while held, release on pointerup
  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  clock.tick(39);
  expect(count).to.equal(0);
  clock.tick(1);
  expect(count).to.equal(1);
  expect(released).to.equal(0);
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
  expect(released).to.equal(1);

  container.remove();
});

it('`longPress` cancels on move and pointercancel', () => {
  let count = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  render(html`<div ${longPress(() => count++, { delay: 40 })}></div>`, container);

  const el = container.querySelector('div')!;

  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 0, clientY: 0 }));
  el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 20, clientY: 0 }));
  clock.tick(1000);
  expect(count).to.equal(0);

  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
  clock.tick(1000);
  expect(count).to.equal(0);

  container.remove();
});

it('`longPress` blocks the context menu unless disabled', () => {
  let count = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  const draw = (disabled: boolean) =>
    render(html`<div ${longPress(() => count++, { delay: 40, disabled })}></div>`, container);
  const contextMenu = () => {
    const evt = new Event('contextmenu', { cancelable: true });
    container.querySelector('div')!.dispatchEvent(evt);
    return evt.defaultPrevented;
  };

  draw(false);
  expect(contextMenu()).to.equal(true);

  draw(true);
  expect(contextMenu()).to.equal(false);
  container.querySelector('div')!.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  clock.tick(1000);
  expect(count).to.equal(0);

  container.remove();
});
