import { icons } from 'tap-ui/lib/icons';

import { routes } from './routes';

import 'tap-ui/elements/page';
import 'tap-ui/elements/route';
import 'tap-ui/elements/tabbar';

@customElement('tap-app-root')
export class TapAppAppElement extends GemElement {
  @template()
  #render = () => html`
    <tap-page>
      <tap-route .routes=${routes}></tap-route>
      <tap-tabbar
        slot="footer"
        .items=${[
          { label: 'Home', path: '/', pattern: '/', icon: icons.menu },
          { label: 'Chats', path: '/chats', pattern: '/chats', icon: icons.info },
          { label: 'Settings', path: '/settings', pattern: '/settings', icon: icons.tune },
        ]}
      ></tap-tabbar>
    </tap-page>
  `;
}
