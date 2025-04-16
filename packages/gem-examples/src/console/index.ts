import 'duoyun-ui/helper/error';

import { html, render } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { Toast } from 'duoyun-ui/elements/toast';
import { darkTheme, lightTheme, theme } from 'duoyun-ui/lib/theme';
import { sleep } from 'duoyun-ui/lib/timer';
import { type ContextMenus, type NavItems, type Routes, type UserInfo } from 'duoyun-ui/patterns/console';

import 'duoyun-ui/elements/badge';
import 'duoyun-ui/elements/card';
import 'duoyun-ui/elements/paragraph';
import 'duoyun-ui/patterns/console';

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
  users: {
    pattern: '/users',
    title: 'API Pagination',
    async getContent() {
      await sleep(500);
      await import('./users');
      return html`<console-page-users></console-page-users>`;
    },
  },
  usersClient: {
    pattern: '/users-client',
    title: 'Client Pagination',
    async getContent() {
      await import('./users-client');
      return html`<console-page-users-client></console-page-users-client>`;
    },
  },
  item3: {
    pattern: '/item3/:id',
    title: 'Dynamic Params',
    async getContent(params) {
      await import('./dynamic');
      return html`<console-page-dynamic id=${params.id}></console-page-dynamic>`;
    },
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
    content: html`
      <dy-card style="width: 240px" .header=${'About'}>
        <dy-paragraph>
          Elit aute excepteur dolore occaecat esse <kbd>F</kbd> aliqua mollit duis culpa aliqua adipisicing culpa.
        </dy-paragraph>
      </dy-card>
    `,
  },
} satisfies Routes;

const navItems: NavItems = [
  routes.home,
  {
    title: 'Group 1',
    group: [
      { ...routes.users, slot: html`<dy-badge small count="New"></dy-badge>` },
      routes.usersClient,
      { ...routes.item3, params: { id: crypto.randomUUID() } },
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
    handle: () => Toast.open('info', 'Click Menu Command'),
  },
  {
    text: 'Command 1',
    handle: () => Toast.open('info', 'Click Menu Command 1'),
  },
  {
    text: 'Command 2',
    handle: () => Toast.open('info', 'Click Menu Command 2'),
  },
  {
    text: 'Switch to Light',
    handle: () => theme(lightTheme),
  },
  {
    text: 'Switch to Dark',
    handle: () => theme(darkTheme),
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
