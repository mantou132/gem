import { html, render } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { Toast } from 'duoyun-ui/elements/toast';
import { sleep } from 'duoyun-ui/lib/timer';
import { type ContextMenus, type Routes, type UserInfo, type NavItems } from 'duoyun-ui/patterns/console';

import 'duoyun-ui/patterns/console';
import 'duoyun-ui/elements/badge';
import 'duoyun-ui/elements/code-block';

import 'duoyun-ui/helper/error';

history.basePath = '/console';

const routes = {
  home: {
    pattern: '/',
    title: 'Home Page',
    async getContent() {
      await sleep(100);
      await import('./home');
      return html`<console-page-home></console-page-home>`;
    },
  },
  item: {
    pattern: '/items/:id',
    title: 'Item Page',
    async getContent() {
      await sleep(500);
      await import('./item');
      return html`<console-page-item></console-page-item>`;
    },
  },
  item2: {
    pattern: '/item2',
    title: 'Item Page(Client)',
    async getContent() {
      await import('./item-client');
      return html`<console-page-item-client></console-page-item-client>`;
    },
  },
  item3: {
    pattern: '/item3',
    title: 'Page 3 in Group 1',
    content: html`Page 3`,
  },
  item4: {
    pattern: '/item4',
    title: 'Page 4 in Group 2',
    content: html`Page 4`,
  },
  item5: {
    pattern: '/item5',
    title: 'Page 5 in Group 2',
    content: html`Page 5`,
  },
  about: {
    pattern: '/about',
    title: `About`,
    content: html`About`,
  },
} satisfies Routes;

const navItems: NavItems = [
  routes.home,
  {
    title: 'Group 1',
    group: [
      {
        ...routes.item,
        params: { id: crypto.randomUUID() },
        slot: html`<dy-badge small count="New"></dy-badge>`,
      },
      routes.item2,
      routes.item3,
    ],
  },
  {
    title: 'Group 2',
    group: [routes.item4, routes.item5],
  },
  routes.about,
];

const contextMenus: ContextMenus = [
  {
    text: 'Command',
    handle: () => Toast.open('default', 'Click Menu Command'),
  },
  {
    text: 'Command 1',
    handle: () => Toast.open('default', 'Click Menu Command 1'),
  },
  {
    text: 'Command 2',
    handle: () => Toast.open('default', 'Click Menu Command 2'),
  },
  {
    text: 'Command 3',
    handle: () => Toast.open('default', 'Click Menu Command 3'),
  },
  {
    text: '---',
  },
  {
    text: 'Logout',
    handle: () => Toast.open('error', 'No Implement!'),
    danger: true,
  },
];

const userInfo: UserInfo = {
  username: 'Mantou',
  org: 'DuoyunUI',
  profile: '/about',
};

render(
  html`
    <dy-pat-console
      name="DuoyunUI"
      .logo=${'https://duoyun-ui.gemjs.org/logo.png'}
      .routes=${routes}
      .navItems=${navItems}
      .contextMenus=${contextMenus}
      .userInfo=${userInfo}
      .keyboardAccess=${true}
      .responsive=${true}
    ></dy-pat-console>
  `,
  document.body,
);
