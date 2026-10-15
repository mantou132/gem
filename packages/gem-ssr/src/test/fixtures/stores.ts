import { createStore, html } from '@mantou/gem';

const userStore = createStore<{ nickname: string }>({ nickname: 'guest' }, 'user');

export const withStore = (nickname: string) => {
  userStore({ nickname });
  return html`<p></p>`;
};
