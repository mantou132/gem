import { html } from '@mantou/gem';

// 模版按 `strings` 缓存，相同的 HTML 使用相同的 `strings`
const cache = new Map<string, TemplateStringsArray>();

/**
 * 将服务端生成的 HTML 作为没有绑定的静态模版渲染
 *
 * 和 `innerHTML` 不同，其中的自定义元素会在服务端渲染，客户端水合
 */
export function htmlTemplate(content: string) {
  let strings = cache.get(content);
  if (!strings) {
    strings = Object.assign([content], { raw: [content] });
    cache.set(content, strings);
  }
  return html(strings);
}
