import { GemElement, html, connectStore, customElement, render } from '@mantou/gem';
import { I18n } from '@mantou/gem/helper/i18n';

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

@connectStore(i18n.store)
@connectStore(i18nModule.store)
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
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
