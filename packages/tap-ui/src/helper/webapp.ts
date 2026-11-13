import { html, type TemplateResult } from '@mantou/gem/lib/lit-html';

import { Stack } from '../elements/stack';
import { theme } from '../lib/theme';
import { initApp as initTapApp, type TapInitAppOptions } from './base/webapp';

import '../elements/reflect';

export { getWebManifestURL } from './base/webapp';

interface InitAppOptions extends TapInitAppOptions {
  /**Rendered into `body` instead of the root page of the global Stack, for layouts beside it (e.g. a split view sidebar); its `<tap-stack>` becomes the global Stack */
  layout?: TemplateResult;
  /**Closing the root page of `template` (`Stack.pop()` or swiping back on it), e.g. to leave the app; with `layout`, listen to `root-close` on its `<tap-stack>` */
  onRootClose?: () => void;
}

export function initApp(options: InitAppOptions = {}) {
  initTapApp({
    ...options,
    template: html`
      <tap-reflect>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content">
        <style>
          :where(body, html) {
            width: 100%;
            margin: 0;
            font-family: ${theme.font};
            overflow: hidden;
            /* Android 禁用手势 */
            overscroll-behavior: contain;
          }
          html {
            height: 100%;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }
          input,
          textarea,
          [contenteditable] {
            user-select: text;
            -webkit-user-select: text;
          }
          body {
            background: black;
            color: ${theme.textColor};
            position: relative;
            height: min(100%, 100% - var(--keyboard-height, 0px) + var(--safe-area-inset-bottom, 0px));
          }
          @supports (-webkit-touch-callout: none) {
            body {
              transition: height 0.25s cubic-bezier(0.2, 0, 0, 1);
            }
          }
        </style>
      </tap-reflect>
      ${options.layout}
    `,
  });

  if (options.template) {
    Stack.push({
      history: false,
      animated: false,
      keepAlive: true,
      content: options.template,
    });
    if (options.onRootClose) Stack.instance!.addEventListener('root-close', options.onRootClose);
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
