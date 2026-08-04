import type { RouteItem } from 'tap-ui/elements/route';

import './cards';
import './chats';
import './contacts';
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
  cards: {
    pattern: '/cards',
    title: 'Cards',
    getContent() {
      return html`<tap-app-cards></tap-app-cards>`;
    },
  },
  chats: {
    pattern: '/chats',
    title: 'Chats',
    getContent() {
      return html`<tap-app-chats></tap-app-chats>`;
    },
  },
  contacts: {
    pattern: '/contacts',
    title: 'Contacts',
    getContent() {
      return html`<tap-app-contacts></tap-app-contacts>`;
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
