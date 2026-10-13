// 服务端和客户端共享

export const LIT_PART_END = '/lit';
export const LIT_PART_START_RE = /\?lit\$(\d+)\$/;
// SSR 输出的隐藏分支，值是原始 `style`
export const SSR_HIDDEN = 'ssr-hidden';
// SSR 输出的 light DOM 样式，水合时忽略
export const SSR_STYLE = 'ssr-style';
export const V_IF = 'v-if';
export const V_ELSE_IF = 'v-else-if';
export const V_ELSE = 'v-else';
