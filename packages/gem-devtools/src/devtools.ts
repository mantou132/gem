import { devtools } from 'webextension-polyfill';

import { execution } from './common';
import { observeSelectedElement } from './scripts/observer';

devtools.panels.elements.createSidebarPane('Gem').then((sidebar) => {
  // sidebar.setPage('test.html');
  sidebar.setPage('sidebarpanel.html');
});

devtools.panels.elements.onSelectionChanged.addListener(() => {
  execution(observeSelectedElement, []);
});
