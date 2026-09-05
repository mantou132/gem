import { html } from '@mantou/gem/lib/element';
import { aTimeout, expect, fixture, nextFrame } from '@mantou/gem/test/utils';

import type { TapPullContainerElement } from '../../elements/pull-container';
import type { TapSheetElement } from '../../elements/sheet';

import '../../elements/pull-container';
import '../../elements/sheet';

describe('TapSheetElement & TapPullContainerElement with internal scroll', () => {
  it('should not pull when internal container is scrolled', async () => {
    let pullCount = 0;
    const container: TapPullContainerElement = await fixture(html`
      <tap-pull-container
        style="height: 200px;"
        @pull=${() => {
          pullCount++;
        }}
      >
        <div id="inner" style="height: 100px; overflow-y: auto;">
          <div id="content" style="height: 400px;">Content</div>
        </div>
      </tap-pull-container>
    `);

    const inner = container.querySelector('#inner') as HTMLElement;
    const content = container.querySelector('#content') as HTMLElement;

    // Simulate scrolled state
    inner.scrollTop = 50;
    await nextFrame();

    content.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    // Pull down while inner is still scrolled
    content.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 150,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    await Promise.resolve();
    expect(pullCount).to.equal(0);

    // Now inner container scrolls to top
    inner.scrollTop = 0;

    // Continue pulling down after scrolled to top
    content.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 180,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    await Promise.resolve();
    expect(pullCount).to.be.greaterThan(0);

    content.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 100,
        clientY: 180,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );
  });

  it('should pull immediately when internal container is at top', async () => {
    let pullDistance = 0;
    const container: TapPullContainerElement = await fixture(html`
      <tap-pull-container
        style="height: 200px;"
        @pull=${(e: CustomEvent<{ distance: number }>) => {
          pullDistance = e.detail.distance;
        }}
      >
        <div id="inner" style="height: 100px; overflow-y: auto;">
          <div id="content" style="height: 400px;">Content</div>
        </div>
      </tap-pull-container>
    `);

    const inner = container.querySelector('#inner') as HTMLElement;
    const content = container.querySelector('#content') as HTMLElement;

    inner.scrollTop = 0;
    await nextFrame();

    content.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    content.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 140,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    await Promise.resolve();
    expect(pullDistance).to.equal(40);
  });

  it('tap-sheet with inner scroll container only pulls when at top', async () => {
    const sheet: TapSheetElement = await fixture(html`
      <tap-sheet open>
        <div id="inner" style="height: 150px; overflow-y: auto;">
          <div id="item" style="height: 500px;">Item</div>
        </div>
      </tap-sheet>
    `);

    // Wait for entrance animation to finish (350ms)
    await aTimeout(400);
    const inner = sheet.querySelector('#inner') as HTMLElement;
    const item = sheet.querySelector('#item') as HTMLElement;
    const sheetDialog = sheet.shadowRoot?.querySelector('.sheet') as HTMLElement;

    expect(sheetDialog.style.transform).to.include('translateY(0px)');

    // When scrolled, pulling item should not move sheet
    inner.scrollTop = 100;
    await nextFrame();

    item.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    item.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 160,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    await nextFrame();
    expect(sheetDialog.style.transform).to.include('translateY(0px)');

    // When inner reaches top, further pull moves sheet
    inner.scrollTop = 0;
    item.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 200,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    await nextFrame();
    expect(sheetDialog.style.transform).to.not.include('translateY(0px)');
  });

  it('nested scroll containers wait for all to reach top', async () => {
    let pullCount = 0;
    const container: TapPullContainerElement = await fixture(html`
      <tap-pull-container
        style="height: 300px;"
        @pull=${() => {
          pullCount++;
        }}
      >
        <div id="outer" style="height: 200px; overflow-y: auto;">
          <div id="inner" style="height: 100px; overflow-y: auto;">
            <div id="deep" style="height: 500px;">Deep Content</div>
          </div>
          <div style="height: 300px;">Outer Space</div>
        </div>
      </tap-pull-container>
    `);

    const outer = container.querySelector('#outer') as HTMLElement;
    const inner = container.querySelector('#inner') as HTMLElement;
    const deep = container.querySelector('#deep') as HTMLElement;

    // Case 1: inner scrolled, outer at top -> should NOT pull
    inner.scrollTop = 30;
    outer.scrollTop = 0;
    await nextFrame();

    deep.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    deep.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 150,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    await Promise.resolve();
    expect(pullCount).to.equal(0);

    // Case 2: inner at top, outer scrolled -> should NOT pull
    inner.scrollTop = 0;
    outer.scrollTop = 40;
    await nextFrame();

    deep.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 170,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    await Promise.resolve();
    expect(pullCount).to.equal(0);

    // Case 3: both at top -> should pull
    outer.scrollTop = 0;
    await nextFrame();

    deep.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 210,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    await Promise.resolve();
    expect(pullCount).to.be.greaterThan(0);
  });

  it('horizontal scroll container does not block vertical pull', async () => {
    let pullCount = 0;
    const container: TapPullContainerElement = await fixture(html`
      <tap-pull-container
        style="height: 200px;"
        @pull=${() => {
          pullCount++;
        }}
      >
        <div id="hscroll" style="width: 100px; overflow-x: auto; overflow-y: hidden; white-space: nowrap;">
          <div id="hcontent" style="display: inline-block; width: 500px;">Horizontal items</div>
        </div>
      </tap-pull-container>
    `);

    const hcontent = container.querySelector('#hcontent') as HTMLElement;
    await nextFrame();

    hcontent.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    hcontent.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 150,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    await Promise.resolve();
    expect(pullCount).to.be.greaterThan(0);
  });
});
