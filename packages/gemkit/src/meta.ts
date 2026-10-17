import { escapeHtml } from './constants';

/** 页面的 `<meta>`，key 包含 `:` 时（例如 `og:image`）输出为 `property`，否则为 `name`，值为 `undefined` 时不输出 */
export type Meta = Record<string, string | undefined>;

const getAttrName = (key: string) => (key.includes(':') ? 'property' : 'name');

const entries = (meta: Meta) =>
  Object.entries(meta).filter((entry): entry is [string, string] => entry[1] !== undefined);

/** 服务端输出到 `<head>` 中 */
export const formatMeta = (meta: Meta) =>
  entries(meta)
    .map(([key, value]) => `<meta ${getAttrName(key)}="${escapeHtml(key)}" content="${escapeHtml(value)}">`)
    .join('');

// 上次设置的 key，导航后需要移除新页面没有的
let currentKeys: string[] = [];

/** 客户端导航后更新 `<head>`，同名的 `<meta>` 先移除，包括服务端输出的 */
export function updateMeta(meta: Meta) {
  const list = entries(meta);
  for (const key of new Set([...currentKeys, ...list.map(([key]) => key)])) {
    document.head.querySelectorAll(`meta[${getAttrName(key)}="${CSS.escape(key)}"]`).forEach((e) => e.remove());
  }
  for (const [key, value] of list) {
    const element = document.createElement('meta');
    element.setAttribute(getAttrName(key), key);
    element.content = value;
    document.head.append(element);
  }
  currentKeys = list.map(([key]) => key);
}
