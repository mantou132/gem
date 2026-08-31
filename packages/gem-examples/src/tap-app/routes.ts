import type { RouteItem } from '@mantou/tap-ui/elements/route';

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
      return html`<t-home></t-home>`;
    },
  },
  cards: {
    pattern: '/cards',
    title: 'Cards',
    getContent() {
      return html`<t-cards></t-cards>`;
    },
  },
  chats: {
    pattern: '/chats',
    title: 'Chats',
    getContent() {
      return html`<t-chats></t-chats>`;
    },
  },
  contacts: {
    pattern: '/contacts',
    title: 'Contacts',
    getContent() {
      return html`<t-contacts></t-contacts>`;
    },
  },
  settings: {
    pattern: '/settings',
    title: 'Settings',
    getContent() {
      return html`<t-settings></t-settings>`;
    },
  },
} satisfies Record<string, RouteItem>;
