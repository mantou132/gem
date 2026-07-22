import { html } from '@mantou/gem/lib/lit-html';

import { Stack } from '../elements/stack';
import { initApp as initTapApp, type TapInitAppOptions } from './base/webapp';

export { getWebManifestURL } from './base/webapp';

interface InitAppOptions extends TapInitAppOptions {}

export function initApp(options: InitAppOptions = {}) {
  initTapApp({
    ...options,
    template: html`
      <style>
        :where(body, html) {
          margin: 0;
          overflow: hidden;
          /* Android 禁用手势 */
          overscroll-behavior: contain;
        }
      </style>
    `,
  });

  if (options.template) {
    Stack.push({
      gesture: false,
      animated: false,
      content: options.template,
    });
  }

  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    // IOS 禁用手势: https://bugs.webkit.org/show_bug.cgi?id=240183
    document.addEventListener(
      'touchstart',
      (e) => {
        const edge = 24;
        const x = e.touches[0]?.pageX ?? 0;
        if (x > edge && x < window.innerWidth - edge) return;
        if (e.composedPath().some((n) => 'active' in n || n instanceof HTMLButtonElement)) return;
        e.preventDefault(); // 拦截 Safari 左右滑导航
      },
      { passive: false },
    );
  }
}
