import { devtools } from 'webextension-polyfill';

devtools.panels.elements.createSidebarPane('Gem').then((sidebar) => {
  // sidebar.setPage('test.html');
  sidebar.setPage('sidebarpanel.html');
});
