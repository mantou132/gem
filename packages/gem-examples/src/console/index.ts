import { html, render } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { Toast } from 'duoyun-ui/elements/toast';
import { sleep } from 'duoyun-ui/lib/utils';
import { type Menus, type Routes, type UserInfo, type NavItems } from 'duoyun-ui/patterns/console';

import 'duoyun-ui/patterns/console';
import 'duoyun-ui/elements/badge';
import 'duoyun-ui/elements/code-block';

history.basePath = '/console';

const routes: Routes = {
  home: {
    pattern: '/',
    title: 'Home Page',
    getContent() {
      import('./home');
      return html`<console-page-home></console-page-home>`;
    },
  },
  item1: {
    pattern: '/items/:id',
    title: 'Items Page',
    async getContent() {
      await sleep(3000);
      import('./item');
      return html`<console-page-item></console-page-item>`;
    },
  },
  item2: {
    pattern: '/item2',
    title: 'Page 2 in Group 1',
    content: html`Page 2`,
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
};

const navItems: NavItems = [
  routes.home,
  {
    title: 'Group 1',
    group: [
      {
        ...routes.item1,
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

const menus: Menus = [
  {
    text: 'Test',
    handle: () => Toast.open('default', 'Click Menu Test'),
  },
  {
    text: 'Test 1',
    handle: () => Toast.open('default', 'Click Menu Test 1'),
  },
  {
    text: 'Test 2',
    handle: () => Toast.open('default', 'Click Menu Test 2'),
  },
  {
    text: 'Test 3',
    handle: () => Toast.open('default', 'Click Menu Test 3'),
  },
  {
    text: '---',
  },
  {
    text: 'Test 4',
    handle: () => Toast.open('error', 'Click Menu Test 4'),
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
      logo="https://duoyun-ui.gemjs.org/logo.png"
      .routes=${routes}
      .navItems=${navItems}
      .menus=${menus}
      .userInfo=${userInfo}
      .keyboardAccess=${true}
      .responsive=${true}
    ></dy-pat-console>
  `,
  document.body,
);
