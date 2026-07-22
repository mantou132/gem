import { history } from '@mantou/gem';
import { initApp } from 'tap-ui/helper/webapp';

import './root';

history.basePath = '/tap-app';

initApp({
  template: html`<tap-app-root></tap-app-root>`,
});
