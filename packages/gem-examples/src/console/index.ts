import { html, render } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { Toast } from 'duoyun-ui/elements/toast';
import { sleep } from 'duoyun-ui/lib/utils';
import type { Menus, Routes, UserInfo, NavItems } from 'duoyun-ui/patterns/console';

import 'duoyun-ui/patterns/console';

history.basePath = '/console';

const routes: Routes = {
  home: {
    pattern: '/',
    title: 'Home Page',
    content: html`Home`,
  },
  item1: {
    pattern: '/items/:id',
    title: 'Item 1 in Group 1',
    async getContent(params) {
      await sleep(3000);
      return html`Random Item, ID: ${JSON.stringify(params)}`;
    },
  },
  item2: {
    pattern: '/item2',
    title: 'Item 2 in Group 1',
    content: html`Item 2`,
  },
  item3: {
    pattern: '/item3',
    title: 'Item 3 in Group 1',
    content: html`Item 3`,
  },
  item4: {
    pattern: '/item4',
    title: 'Item 4 in Group 2',
    content: html`Item 4`,
  },
  item5: {
    pattern: '/item5',
    title: 'Item 5 in Group 2',
    content: html`Item 5`,
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
    <style>
      :root {
        font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
          'Noto Sans', 'PingFang SC', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
          'Noto Color Emoji';
        -moz-osx-font-smoothing: grayscale;
        -webkit-font-smoothing: antialiased;
      }
      html {
        height: 100%;
        overflow: hidden;
      }
      body {
        height: 100%;
        overflow: auto;
        scrollbar-width: thin;
        margin: 0;
        padding: 0;
      }
    </style>
    <dy-pat-console
      name="DuoyunUI"
      logo="https://duoyun-ui.gemjs.org/logo.png"
      .routes=${routes}
      .navItems=${navItems}
      .menus=${menus}
      .userInfo=${userInfo}
      .keyboardAccess=${true}
    ></dy-pat-console>
  `,
  document.body,
);
