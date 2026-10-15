import { createStore } from '@mantou/gem';

// 没有使用 `swc-plugin-gem`，手动指定 key
export const headerStore = createStore({ title: 'Header' }, 'header');
