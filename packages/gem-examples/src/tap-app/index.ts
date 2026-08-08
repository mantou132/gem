import { history } from '@mantou/gem';
import { getWebManifestURL, initApp } from 'tap-ui/helper/webapp';

import './root';

history.basePath = '/tap-app';

initApp({
  template: html`
    <tap-reflect>
      <title>Tap App</title>
      <meta name="theme-color" content="#fff" />
      <link
        rel="manifest"
        href=${getWebManifestURL({
          id: '/tap-app',
          name: 'Tap App',
          short_name: 'Tap App',
          description: 'A mobile-first TapUI application',
          start_url: '/tap-app',
          scope: '/tap-app',
          display: 'fullscreen',
          orientation: 'portrait',
          background_color: '#fff',
          theme_color: '#fff',
        })}
      />
    </tap-reflect>
    <t-root></t-root>
  `,
});
