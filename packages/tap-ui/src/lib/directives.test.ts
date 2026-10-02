import { html, render } from '@mantou/gem/lib/element';
import { expect } from '@mantou/gem/test/utils';

import { longPress, repeatPress } from './directives';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

it('`repeatPress` basic immediate click and pointerdown', async () => {
  let count = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  render(html`<button ${repeatPress(() => count++, { delay: 50, interval: 20 })}></button>`, container);

  const btn = container.querySelector('button')!;

  // Pointerdown triggers immediately
  btn.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  expect(count).to.equal(1);

  // Wait for repeat
  await sleep(120);
  expect(count).to.be.greaterThan(2);

  // Stop repeat
  btn.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 }));
  const countAfterStop = count;

  await sleep(50);
  expect(count).to.equal(countAfterStop);

  // Keyboard activation (detail === 0)
  btn.dispatchEvent(new MouseEvent('click', { detail: 0 }));
  expect(count).to.equal(countAfterStop + 1);

  // Mouse click (detail > 0) should not double trigger
  btn.dispatchEvent(new MouseEvent('click', { detail: 1 }));
  expect(count).to.equal(countAfterStop + 1);

  container.remove();
});

it('`repeatPress` with disabled option', async () => {
  let count = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  render(html`<button ${repeatPress(() => count++, { disabled: true })}></button>`, container);

  const btn = container.querySelector('button')!;
  btn.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  btn.dispatchEvent(new MouseEvent('click', { detail: 0 }));
  expect(count).to.equal(0);

  container.remove();
});

it('`repeatPress` stops when action returns false', async () => {
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

  await sleep(150);
  expect(count).to.equal(3);

  container.remove();
});

it('`longPress` fires after delay and calls release on pointerup', async () => {
  let count = 0;
  let released = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  render(html`<div ${longPress(() => count++, { delay: 40, release: () => released++ })}></div>`, container);

  const el = container.querySelector('div')!;

  // Short press does not fire
  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  await sleep(10);
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
  await sleep(60);
  expect(count).to.equal(0);
  expect(released).to.equal(0);

  // Long press fires while held, release on pointerup
  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  await sleep(60);
  expect(count).to.equal(1);
  expect(released).to.equal(0);
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
  expect(released).to.equal(1);

  container.remove();
});

it('`longPress` cancels on move and pointercancel', async () => {
  let count = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);

  render(html`<div ${longPress(() => count++, { delay: 40 })}></div>`, container);

  const el = container.querySelector('div')!;

  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 0, clientY: 0 }));
  el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 20, clientY: 0 }));
  await sleep(60);
  expect(count).to.equal(0);

  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
  el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
  await sleep(60);
  expect(count).to.equal(0);

  container.remove();
});

it('`longPress` blocks the context menu unless disabled', async () => {
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
  await sleep(60);
  expect(count).to.equal(0);

  container.remove();
});
