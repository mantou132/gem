import { html, render } from '@mantou/gem/lib/element';
import { expect } from '@mantou/gem/test/utils';

import { repeatPress } from './directives';

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
