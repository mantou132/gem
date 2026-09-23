import { expect } from '@mantou/gem/test/utils';

import type { VisibleBaseElement } from './visible';
import { visibilityObserver } from './visible';

for (const trackVisibility of [false, true]) {
  it(`tracks edge-adjacent targets with trackVisibility=${trackVisibility}`, () => {
    const NativeObserver = window.IntersectionObserver;
    let callback: IntersectionObserverCallback;
    let observer: IntersectionObserver;
    window.IntersectionObserver = new Proxy(NativeObserver, {
      construct(Target, [handler, options]) {
        callback = handler;
        observer = new Target(handler, options);
        return observer;
      },
    });

    const events: string[] = [];
    const element = document.createElement('div') as unknown as VisibleBaseElement;
    element.visible = false;
    element.trackVisibility = trackVisibility;
    element.show = () => {
      events.push('show');
    };
    element.hide = () => {
      events.push('hide');
    };
    let cleanup: (() => void) | undefined;
    const notify = (...records: [boolean, number, boolean][]) => {
      const entries = records.map(([isIntersecting, intersectionRatio, isVisible]) => ({
        target: element,
        time: performance.now(),
        boundingClientRect: new DOMRect(),
        intersectionRect: new DOMRect(),
        rootBounds: null,
        isIntersecting,
        intersectionRatio,
        isVisible,
      }));
      callback(entries, observer);
    };

    try {
      cleanup = visibilityObserver(element);
      expect(observer!.thresholds).to.eql([Number.EPSILON]);
      notify([true, 0, true]);
      expect(element.visible).to.equal(false);
      expect(events).to.eql([]);

      notify([true, Number.EPSILON / 2, true]);
      expect(element.visible).to.equal(false);
      expect(events).to.eql([]);

      notify([true, Number.EPSILON, true]);
      expect(element.visible).to.equal(true);
      expect(events).to.eql(['show']);

      // Intermediate hiding in a batch must not emit events if the final state is unchanged.
      notify([false, 0, false], [true, 1, true]);
      expect(element.visible).to.equal(true);
      expect(events).to.eql(['show']);

      if (trackVisibility) {
        notify([true, 1, false]);
        expect(element.visible).to.equal(false);
        expect(events).to.eql(['show', 'hide']);

        notify([true, 1, false]);
        expect(events).to.eql(['show', 'hide']);

        notify([true, 1, true]);
        expect(element.visible).to.equal(true);
        expect(events).to.eql(['show', 'hide', 'show']);
      }

      notify([false, 0, false]);
      expect(element.visible).to.equal(false);
      expect(events.at(-1)).to.equal('hide');
    } finally {
      cleanup?.();
      window.IntersectionObserver = NativeObserver;
    }
  });
}

it('hides an edge-adjacent page when the first sheet opens', async () => {
  const { TapPageElement } = await import('../page');
  const { TapSheetElement } = await import('../sheet');
  const page = new TapPageElement();
  const sheet = new TapSheetElement();
  const container = document.createElement('div');
  container.style.cssText = `position: fixed; inset: 0; transform: translateX(${innerWidth}px)`;
  container.append(page);
  sheet.snap = false;
  sheet.open = true;

  const nextEvent = (type: string) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Missing ${type} event`)), 1000);
      page.addEventListener(
        type,
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });

  try {
    const events: string[] = [];
    page.addEventListener('show', () => events.push('show'));
    document.body.append(container);
    // Wait beyond the visibility observer's 100ms delay while staying at the edge.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(page.visible).to.equal(false);
    expect(events).to.eql([]);

    const shown = nextEvent('show');
    container.style.transform = `translateX(${innerWidth - 1}px)`;
    await shown;
    expect(page.visible).to.equal(true);

    const left = nextEvent('hide');
    container.style.transform = `translateX(${innerWidth}px)`;
    await left;
    expect(page.visible).to.equal(false);

    const entered = nextEvent('show');
    container.style.transform = 'none';
    await entered;
    const hidden = nextEvent('hide');
    document.body.append(sheet);
    await hidden;
    expect(page.visible).to.equal(false);
  } finally {
    sheet.remove();
    container.remove();
  }
});
