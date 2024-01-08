/**只要元素显示在屏幕内，屏幕就不会自动熄灭 */

import { GemElementOptions } from '@mantou/gem/lib/element';
import { logger } from '@mantou/gem/helper/logger';
import { addListener } from '@mantou/gem/lib/utils';

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
  const removeListener = addListener(document, 'visibilitychange', listener);
  const removeShowListener = addListener(ele, 'show', listener);
  const removeHideListener = addListener(ele, 'hide', listener);
  return async () => {
    removeListener();
    removeShowListener();
    removeHideListener();

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
