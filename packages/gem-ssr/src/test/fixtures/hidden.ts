import { html } from '@mantou/gem';

// 只有模版，客户端使用时不导入服务端元素的定义
export const hiddenServerElement = (show: boolean) =>
  html`<div><app-server-element v-if=${show} text="a"></app-server-element><p v-else>else</p></div>`;
