import type { RouteItem } from 'tap-ui/elements/route';

export const routes = {
  home: {
    pattern: '/',
    title: 'Home',
    getContent() {
      import('./home');
      return html`<tap-app-home></tap-app-home>`;
    },
  },
  settings: {
    pattern: '/settings',
    title: 'Settings',
    getContent() {
      import('./settings');
      return html`<tap-app-settings></tap-app-settings>`;
    },
  },
} satisfies Record<string, RouteItem>;
