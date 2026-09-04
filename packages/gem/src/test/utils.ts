import { assert, expect, should } from 'chai';

import type { TemplateResult } from '../lib/element';
import { render } from '../lib/element';

export { expect, should, assert };

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

export function aTimeout(ms = 0) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

export async function fixture(template: TemplateResult) {
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  render(template, wrapper);
  await nextFrame();
  return wrapper.firstElementChild as any;
}

export function waitForPopState(action?: () => void, timeout = 2000): Promise<PopStateEvent> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = (event: PopStateEvent) => {
      clearTimeout(timer);
      resolve(event);
    };
    window.addEventListener('popstate', handler, { once: true });
    timer = setTimeout(() => {
      window.removeEventListener('popstate', handler);
      reject(new Error(`waitForPopState timed out after ${timeout}ms`));
    }, timeout);
    action?.();
  });
}

export function waitUntil(predicate: () => boolean | unknown, timeout = 2000, message?: string): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      try {
        if (predicate()) {
          resolve();
          return;
        }
      } catch {
        // ignore errors during evaluation
      }
      if (Date.now() - start > timeout) {
        reject(new Error(message || `waitUntil timed out after ${timeout}ms`));
        return;
      }
      setTimeout(check, 10);
    }
    check();
  });
}
