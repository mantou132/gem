import { customElement, GemElement, html, render } from '@mantou/gem';
import { I18n } from '@mantou/gem/helper/i18n';
import type { RouteItem } from 'duoyun-ui/elements/route';

import 'duoyun-ui/elements/route';
import '../elements/layout';

const en = {
  title: 'This is I18n',
  hello: 'Hello, $1! $2=> $1, Hello!',
  detail: 'See $1<detail>, $1<detail2>',
};
const i18n = new I18n<typeof en>({
  cache: true,
  fallbackLanguage: 'en',
  resources: {
    en,
    de: {
      title: 'Das ist I18n',
    },
    zh: 'data:text/plain;base64,eyJ0aXRsZSI6Iui/meaYr0kxOG4ifQ==',
  },
  onChange: console.log,
});

const i18nModule = i18n.createSubModule<typeof en>('test', {
  en,
  de: {
    title: 'Das ist I18n',
  },
  zh: 'data:text/plain;base64,eyJ0aXRsZSI6Iui/meaYr0kxOG4ifQ==',
});

const localizeRoutes: RouteItem[] = [
  {
    pattern: 'en',
    getContent() {
      return html`en element`;
    },
  },
  {
    pattern: 'de',
    getContent() {
      return html`de element`;
    },
  },
  {
    pattern: '*',
    getContent() {
      return html`other element`;
    },
  },
];

@customElement('app-root')
export class App extends GemElement {
  render() {
    return html`
      <button @click=${() => i18n.setLanguage('de')}>de</button>
      <button @click=${() => i18n.setLanguage('zh')}>zh</button>
      <button @click=${() => i18n.setLanguage('en')}>en</button>
      <button @click=${() => i18n.resetLanguage()}>reset</button>
      <p>Current language: ${i18n.currentLanguage}</p>
      <p>${i18n.get('title')}</p>
      <p>${i18n.get('hello', 'World', 'reverse')}</p>
      <p>${i18n.get('detail', (s) => html`<a href="#">${s}</a>`)}</p>

      <h2>sub module</h2>
      <p>${i18nModule.get('title')}</p>
      <p>${i18nModule.get('hello', 'World', 'reverse')}</p>
      <p>${i18nModule.get('detail', (s) => html`<a href="#">${s}</a>`)}</p>

      <h2>localize content</h2>
      <dy-route .trigger=${i18n} .routes=${localizeRoutes}></dy-route>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
