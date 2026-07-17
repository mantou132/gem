import type { RouteItem } from 'tap-ui/elements/route';

import './chats';
import './home';
import './settings';

export const routes = {
  home: {
    pattern: '/',
    title: 'Home',
    getContent() {
      return html`<tap-app-home></tap-app-home>`;
    },
  },
  chats: {
    pattern: '/chats',
    title: 'Chats',
    getContent() {
      return html`<tap-app-chats></tap-app-chats>`;
    },
  },
  settings: {
    pattern: '/settings',
    title: 'Settings',
    getContent() {
      return html`<tap-app-settings></tap-app-settings>`;
    },
  },
} satisfies Record<string, RouteItem>;
