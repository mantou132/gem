import { I18n } from '@mantou/gem/helper/i18n';
import { customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html, render } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import type { Help, Languages, Links, Social, Terms } from 'duoyun-ui/patterns/footer';

import 'duoyun-ui/patterns/footer';
import 'duoyun-ui/patterns/nav';

history.basePath = '/homepage';

const i18n = new I18n({
  fallbackLanguage: 'zh',
  resources: {
    zh: {},
    en: {},
  },
});

@customElement('my-homepage')
export class MyHomepage extends GemElement {
  #social: Social = {
    label: 'Follow us',
    items: [
      {
        label: 'youtube',
        icon: 'https://www.google.com/chrome/static/images/fallback/icon-youtube.jpg',
        href: '/',
      },
      {
        label: 'twitter',
        icon: 'https://www.google.com/chrome/static/images/fallback/icon-twitter.jpg',
        href: '/',
      },
      {
        label: 'fb',
        icon: 'https://www.google.com/chrome/static/images/fallback/icon-fb.jpg',
        href: '/',
      },
    ],
  };

  #links: Links = [
    {
      label: 'Chrome Family',
      items: [
        { label: 'Other Platforms', href: `/#${Math.random()}` },
        { label: 'Chromebooks', href: `/#${Math.random()}` },
        { label: 'Chromecast', href: `/#${Math.random()}` },
      ],
    },
    {
      label: 'Enterprise',
      items: [
        { label: 'Download Chrome Browser', href: `/#${Math.random()}` },
        { label: 'Chrome Browser for Enterprise', href: `/#${Math.random()}` },
        { label: 'Chrome Devices', href: 'https://www.google.com' },
        { label: 'ChromeOS', href: 'https://www.google.com' },
        { label: 'Google Cloud', href: 'https://www.google.com' },
        { label: 'Google Workspace', href: 'https://www.google.com' },
      ],
    },
    {
      label: 'Education',
      items: [
        { label: 'Google Chrome Browser', href: `/#${Math.random()}` },
        { label: 'Devices', href: `/#${Math.random()}` },
        { label: 'Web Store', href: `/#${Math.random()}` },
      ],
    },
    {
      label: 'Dev and Partners',
      items: [
        { label: 'Chromium', href: `/#${Math.random()}` },
        { label: 'ChromeOS', href: `/#${Math.random()}` },
        { label: 'Chrome Web Store', href: `/#${Math.random()}` },
        { label: 'Chrome Experiments', href: 'https://www.google.com' },
        { label: 'Chrome Beta', href: 'https://www.google.com' },
        { label: 'Chrome Dev', href: 'https://www.google.com' },
        { label: 'Chrome Canary', href: 'https://www.google.com' },
      ],
    },
    {
      label: 'Stay Connected',
      items: [
        { label: 'Google Chrome Blog', href: `/#${Math.random()}` },
        { label: 'Update Chrome', href: `/#${Math.random()}` },
        { label: 'Chrome Help', href: 'https://www.google.com' },
        { label: 'Chrome Tips', href: 'https://www.google.com' },
      ],
    },
  ];

  #terms: Terms = [
    { label: 'Privacy and Terms', href: `/#${Math.random()}` },
    { label: 'About Google', href: `/#${Math.random()}` },
    { label: 'Google Products', href: 'https://www.google.com' },
  ];

  #help: Help = {
    label: 'Help',
    href: `/#${Math.random()}`,
  };

  #languages: Languages = {
    current: i18n.currentLanguage,
    names: {
      zh: '中文',
      en: 'English',
    },
  };

  render = () => {
    return html`
      <dy-pat-nav name="Chrome" .logo=${'https://gemjs.org/logo.png'} .links=${this.#links}></dy-pat-nav>
      <article style="height:80vh;display:grid;place-items:center;font-size:3em;font-weight:bold;">
        This is my Product!
      </article>
      <article style="height:30vh;"></article>
      <dy-pat-footer
        .social=${this.#social}
        .links=${this.#links}
        .terms=${this.#terms}
        .logo=${'https://gemjs.org/logo.png'}
        .help=${this.#help}
        .languages=${this.#languages}
      ></dy-pat-footer>
    `;
  };
}

render(
  html`
    <style>
      :where(:root) {
        font-family:
          -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans',
          'PingFang SC', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
      }
      :where(body) {
        margin: 0;
      }
    </style>
    <my-homepage></my-homepage>
  `,
  document.body,
);
