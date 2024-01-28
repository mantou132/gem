import { logger } from '@mantou/gem/helper/logger';

/**Until the callback function resolve */
export async function forever<T>(fn: () => Promise<T>, interval = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error(err);
    await sleep(interval);
    return forever(fn, interval);
  }
}

/**Polling calls until cancel */
export function polling(fn: (args?: any[]) => any, delay: number) {
  let timer = 0;
  let hasExit = false;
  const poll = async () => {
    try {
      await fn();
    } catch {
    } finally {
      if (!hasExit) {
        timer = window.setTimeout(poll, delay);
      }
    }
  };
  poll();
  return (haveNext = false) => {
    hasExit = true;
    haveNext ? setTimeout(() => clearTimeout(timer), delay) : clearTimeout(timer);
  };
}

export function sleep(ms = 3000) {
  return new Promise((res) => setTimeout(res, ms));
}

export function throttle<T extends (...args: any) => any>(
  fn: T,
  wait = 500,
  { leading = false, maxWait = Infinity }: { leading?: boolean; maxWait?: number } = {},
) {
  let timer = 0;
  let first = 0;
  const exec = (...rest: Parameters<T>) => {
    timer = window.setTimeout(() => (timer = 0), wait);
    fn(...(rest as any));
  };
  return (...rest: Parameters<T>) => {
    const now = Date.now();
    if (!timer) first = now;
    if (now - first > maxWait) {
      first = now;
      clearTimeout(timer);
      exec(...rest);
    } else if (leading && !timer) {
      exec(...rest);
    } else {
      clearTimeout(timer);
      timer = window.setTimeout(() => exec(...rest), wait);
    }
  };
}

export function debounce<T extends (...args: any) => any>(
  fn: T,
  wait = 500,
  { leading = false }: { leading?: boolean } = {},
) {
  let timer = 0;
  return function (...args: Parameters<T>) {
    return new Promise<Awaited<ReturnType<typeof fn>>>((resolve, reject) => {
      clearTimeout(timer);
      timer = window.setTimeout(
        () => {
          timer = window.setTimeout(() => (timer = 0), wait);
          Promise.resolve(fn(...(args as any)))
            .then(resolve)
            .catch(reject);
        },
        leading && !timer ? 0 : wait,
      );
    });
  };
}

/**Invoke the function by condition */
export function invoke<T extends (...args: any) => any>(
  fn: T,
  condition: (options: {
    count: number;
    timestamp: number;
    prevTimestamp: number;
    invokeCount: number;
    invokeTimestamp: number;
  }) => boolean,
) {
  let result: ReturnType<T> | undefined;
  let count = 0;
  let invokeCount = 0;
  let timestamp = 0;
  let prevTimestamp = 0;
  let invokeTimestamp = 0;
  return (...rest: Parameters<T>) => {
    prevTimestamp = timestamp;
    timestamp = performance.now();
    count++;
    if (condition({ count, invokeCount, timestamp, prevTimestamp, invokeTimestamp })) {
      invokeTimestamp = timestamp;
      invokeCount++;
      result = fn(...(rest as any));
    }
    return result;
  };
}

/**Only invoke first */
export function once<T extends (...args: any) => any>(fn: T) {
  return invoke(fn, ({ count }) => count === 1) as T;
}

/**Ignore the first invoke */
export function omitOnce<T extends (...args: any) => any>(fn: T) {
  return invoke(fn, ({ count }) => count !== 1);
}
