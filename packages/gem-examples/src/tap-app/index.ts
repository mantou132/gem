import { history, render } from '@mantou/gem';
import { icons } from 'tap-ui/lib/icons';

import 'tap-ui/elements/page';
import 'tap-ui/elements/route';
import 'tap-ui/elements/tabbar';

import { routes } from './routes';

history.basePath = '/tap-app';

@customElement('app-root')
class AppRoot extends GemElement {
  @template()
  #render = () => html`
    <tap-page>
      <tap-route .routes=${routes}></tap-route>
      <tap-tabbar
        slot="footer"
        .items=${[
          { label: 'Home', path: '/', pattern: '/', icon: icons.menu },
          { label: 'Settings', path: '/settings', pattern: '/settings', icon: icons.tune },
        ]}
      ></tap-tabbar>
    </tap-page>
  `;
}

render(
  html`
    <style>
      :where(body) {
        margin: 0;
        overflow: hidden;
      }
    </style>
    <app-root></app-root>
  `,
  document.body,
);
