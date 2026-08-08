import { icons } from 'tap-ui/lib/icons';

import { routes } from './routes';

@customElement('t-root')
export class TAppElement extends GemElement {
  @template()
  #render = () => html`
    <tap-page>
      <tap-route .routes=${routes}></tap-route>
      <tap-tabbar
        slot="footer"
        .items=${[
          { label: 'Home', path: '/', pattern: '/', icon: icons.menu },
          { label: 'Cards', path: '/cards', pattern: '/cards', icon: icons.expand },
          { label: 'Chats', path: '/chats', pattern: '/chats', icon: icons.info },
          { label: 'Contacts', path: '/contacts', pattern: '/contacts', icon: icons.search },
          { label: 'Settings', path: '/settings', pattern: '/settings', icon: icons.tune },
        ]}
      ></tap-tabbar>
    </tap-page>
  `;
}
