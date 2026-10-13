import { createStore, html } from '@mantou/gem';

export const userStore = createStore<{ nickname: string }>({ nickname: 'guest' });

export const withStore = (nickname: string) => [html`<p></p>`, { stores: { user: [userStore, { nickname }] } }];
