import { history, render } from '@mantou/gem';
import { icons } from 'tap-ui/lib/icons';

import 'tap-ui/elements/page';
import 'tap-ui/elements/route';
import 'tap-ui/elements/tabbar';

import { routes } from './routes';

history.basePath = '/tap-app';

@customElement('app-root')
class AppRoot extends GemElement {
  @template()
  #render = () => html`
    <tap-page>
      <tap-route .routes=${routes}></tap-route>
      <tap-tabbar
        slot="footer"
        .items=${[
          { label: 'Home', path: '/', pattern: '/', icon: icons.menu },
          { label: 'Chats', path: '/chats', pattern: '/chats', icon: icons.info },
          { label: 'Settings', path: '/settings', pattern: '/settings', icon: icons.tune },
        ]}
      ></tap-tabbar>
    </tap-page>
  `;
}

render(
  html`
    <style>
      :where(body, html) {
        margin: 0;
        overflow: hidden;
        /* Android 禁用手势 */
        overscroll-behavior: contain;
      }
    </style>
    <app-root></app-root>
  `,
  document.body,
);

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
