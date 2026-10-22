import { devtools } from 'webextension-polyfill';

import { execution } from './common';
import { observeSelectedElement } from './scripts/observer';
import { installPerformanceTrack } from './scripts/performance';

// DevTools 打开时和页面导航后安装
execution(installPerformanceTrack, []);
devtools.network.onNavigated.addListener(() => execution(installPerformanceTrack, []));

devtools.panels.elements.createSidebarPane('Gem').then((sidebar) => {
  // sidebar.setPage('test.html');
  sidebar.setPage('sidebarpanel.html');
});

devtools.panels.elements.onSelectionChanged.addListener(() => {
  execution(observeSelectedElement, []);
});
