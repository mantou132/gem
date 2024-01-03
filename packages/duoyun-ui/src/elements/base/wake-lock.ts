/**只要元素显示在屏幕内，屏幕就不会自动熄灭 */

import { GemElementOptions } from '@mantou/gem/lib/element';
import { logger } from '@mantou/gem/helper/logger';

import { DuoyunVisibleBaseElement } from './visible';

export function wakeLock(ele: DuoyunWakeLockBaseElement) {
  let wakeLockPromise: Promise<WakeLockSentinel> | null = null;

  const listener = async () => {
    if (document.visibilityState === 'visible' && ele.visible) {
      wakeLockPromise = navigator.wakeLock?.request('screen');

      // log
      wakeLockPromise?.then((wakeLock) => {
        logger.info('wake lock created!');
        wakeLock.addEventListener('release', () => {
          logger.info('wake lock released!');
        });
      });
    } else {
      (await wakeLockPromise)?.release();
    }
  };

  // 当页面处于非活动状态时该锁自动失效
  document.addEventListener('visibilitychange', listener);
  ele.addEventListener('show', listener);
  ele.addEventListener('hide', listener);
  return async () => {
    document.removeEventListener('visibilitychange', listener);
    ele.removeEventListener('show', listener);
    ele.removeEventListener('hide', listener);

    (await wakeLockPromise)?.release();
  };
}

export class DuoyunWakeLockBaseElement<_T = Record<string, unknown>> extends DuoyunVisibleBaseElement {
  constructor(options?: GemElementOptions) {
    super(options);
    this.effect(
      () => wakeLock(this),
      () => [],
    );
  }
}
