import { assert, expect, should } from 'chai';

import type { TemplateResult } from '../lib/element';
import { render } from '../lib/element';

export { assert, expect, should };

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

export function aTimeout(ms = 0) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

export function createFakeTimers() {
  type Task = { at: number; every?: number; fn: () => void };
  const tasks = new Map<number, Task>();
  const originals = {
    setTimeout: window.setTimeout,
    setInterval: window.setInterval,
    clearTimeout: window.clearTimeout,
    clearInterval: window.clearInterval,
  };
  const realClearTimeout = window.clearTimeout.bind(window);
  let now = 0;
  let nextId = -1;

  const schedule = (fn: () => void, delay = 0, every?: number) => {
    const id = nextId--;
    tasks.set(id, { at: now + Math.max(delay, 0), every, fn });
    return id;
  };

  return {
    install: () => {
      window.setTimeout = ((fn: () => void, delay?: number) =>
        schedule(fn, delay)) as unknown as typeof window.setTimeout;
      window.setInterval = ((fn: () => void, delay?: number) =>
        schedule(fn, delay, Math.max(delay ?? 1, 1))) as unknown as typeof window.setInterval;
      const clear = ((id: number) => {
        if (!tasks.delete(id)) realClearTimeout(id);
      }) as unknown as typeof window.clearTimeout;
      window.clearTimeout = clear;
      window.clearInterval = clear;
    },
    uninstall: () => {
      window.setTimeout = originals.setTimeout;
      window.setInterval = originals.setInterval;
      window.clearTimeout = originals.clearTimeout;
      window.clearInterval = originals.clearInterval;
      tasks.clear();
    },
    tick: (ms: number) => {
      const end = now + ms;
      for (;;) {
        let next: { id: number; task: Task } | undefined;
        for (const [id, task] of tasks) {
          if (task.at <= end && (!next || task.at < next.task.at)) next = { id, task };
        }
        if (!next) break;
        now = next.task.at;
        if (next.task.every === undefined) tasks.delete(next.id);
        else next.task.at += next.task.every;
        next.task.fn();
      }
      now = end;
    },
  };
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
