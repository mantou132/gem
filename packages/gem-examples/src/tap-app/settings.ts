import { Browser } from '@mantou/tap-ui/elements/browser';
import { Stack } from '@mantou/tap-ui/elements/stack';
import { contentsContainer } from '@mantou/tap-ui/lib/styles';

import { VERSION } from '../env';

const style = css`
  .footer {
    height: calc(1.4em + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
  }
  .about-hero {
    text-align: center;
    padding-block: 1.5em 0.8em;
  }
  .about-logo {
    font-size: 2.5em;
    line-height: 1;
    margin-block-end: 0.3em;
  }
  .about-title {
    font-size: 1.25em;
    font-weight: 600;
  }
  .about-desc {
    font-size: 0.875em;
    opacity: 0.6;
    margin-block-start: 0.25em;
  }
  .about-copyright {
    text-align: center;
    font-size: 0.8em;
    opacity: 0.5;
    padding-block: 1.2em;
  }
`;

@customElement('t-settings')
@adoptedStyle(style)
@adoptedStyle(contentsContainer)
export class TSettingsElement extends GemElement {
  @boolattribute inSheet: boolean;

  #state = createState({ notifications: true, darkMode: false });

  #openAbout = () => {
    Stack.getClosestStack(this)?.push({
      content: html`<t-about ?inSheet=${this.inSheet}></t-about>`,
    });
  };

  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="Settings"></tap-navbar>
      <tap-cell-group
        heading="General"
        .items=${[
          {
            label: 'Notifications',
            checked: this.#state.notifications,
            onChange: (checked: boolean) => this.#state({ notifications: checked }),
          },
          {
            label: 'Dark Mode',
            checked: this.#state.darkMode,
            onChange: (checked: boolean) => this.#state({ darkMode: checked }),
          },
        ]}
      ></tap-cell-group>
      <tap-cell-group
        heading="About"
        .items=${[{ label: 'Version', description: VERSION ? `v${VERSION}` : '1.0.0', action: true, onClick: this.#openAbout }]}
      ></tap-cell-group>
      <div class="footer"></div>
    </tap-page>
  `;
}

@customElement('t-about')
@adoptedStyle(style)
@adoptedStyle(contentsContainer)
export class TAboutElement extends GemElement {
  @boolattribute inSheet: boolean;

  #openBrowser = (src: string, title: string) => {
    Browser.open({ src, title, stack: this });
  };

  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="About" back default-back></tap-navbar>
      <div class="about-hero">
        <div class="about-logo">💎</div>
        <div class="about-title">Tap App Demo</div>
        <div class="about-desc">Version ${VERSION || '1.0.0'}</div>
      </div>
      <tap-cell-group
        heading="Application"
        .items=${[
          { label: 'Name', description: 'Tap App' },
          { label: 'Version', description: VERSION || '1.0.0' },
          { label: 'Platform', description: 'Mobile Web / PWA' },
        ]}
      ></tap-cell-group>
      <tap-cell-group
        heading="Ecosystem"
        .items=${[
          { label: 'Framework', description: 'Gem' },
          { label: 'UI Library', description: '@mantou/tap-ui' },
          { label: 'Component Count', description: '50+' },
        ]}
      ></tap-cell-group>
      <tap-cell-group
        heading="Resources"
        .items=${[
          {
            label: 'Documentation',
            action: true,
            onClick: () => window.open('https://gemjs.org/', '_blank'),
          },
          {
            label: 'GitHub Repository',
            action: true,
            onClick: () => window.open('https://github.com/mantou132/gem', '_blank'),
          },
          {
            label: 'Help & Guide',
            action: true,
            onClick: () => this.#openBrowser('/tap-browser/guide.html', 'Tap Guide'),
          },
        ]}
      ></tap-cell-group>
      <tap-cell-group
        heading="Legal"
        .items=${[
          {
            label: 'Terms of Service',
            action: true,
            onClick: () => this.#openBrowser('/tap-browser/guide.html', 'Terms of Service'),
          },
          {
            label: 'Privacy Policy',
            action: true,
            onClick: () => this.#openBrowser('/tap-browser/guide.html#privacy', 'Privacy Policy'),
          },
          {
            label: 'Open Source License',
            description: 'MIT',
            action: true,
            onClick: () => window.open('https://github.com/mantou132/gem/blob/main/LICENSE', '_blank'),
          },
        ]}
      ></tap-cell-group>
      <div class="about-copyright">Copyright © 2026 Mantou. All rights reserved.</div>
      <div class="footer"></div>
    </tap-page>
  `;
}
