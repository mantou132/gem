// 服务端和客户端共享

export const LIT_PART_END = '/lit';
export const LIT_PART_START_RE = /\?lit\$(\d+)\$/;
// SSR 输出的隐藏分支，值是原始 `style`
export const SSR_HIDDEN = 'ssr-hidden';
// SSR 输出的 light DOM 样式，水合时忽略
export const SSR_STYLE = 'ssr-style';
// SSR 输出的元素 CSS 状态，样式中的 `:state()` 同时匹配该 attribute，水合时恢复
export const SSR_CSS_STATES = 'ssr-css-states';
export const V_IF = 'v-if';
export const V_ELSE_IF = 'v-else-if';
export const V_ELSE = 'v-else';
// SSR 输出的 store 值，key 是 store 的 key
export const STORES_SCRIPT_ID = 'gem-ssr-stores';
// SSR 输出的纯服务端元素和延时视图元素，客户端据此判断已经有服务端渲染的内容
export const SSR_SERVER = 'ssr-server';
// SSR 输出的元素由父模版设置了 property，水合时等待父模版设置后再渲染
export const SSR_PROPS = 'ssr-props';
