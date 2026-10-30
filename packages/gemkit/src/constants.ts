export const DATA_SCRIPT_ID = 'gemkit-data';
export const DATA_FILE = '__data.json';
/** 预渲染的页面中纯服务端元素的 HTML，客户端导航时使用 */
export const ELEMENTS_FILE = '__elements.json';
/** 渲染纯服务端元素（POST），没有预渲染的元素时使用，例如交互后才出现的元素 */
export const ELEMENT_PATH = '/__gemkit_element';
/** 纯服务端元素和 `$gemkit/api` 请求的响应头，`handle` 或处理函数中跳转的地址，客户端收到后导航 */
export const REDIRECT_HEADER = 'x-gemkit-redirect';
/** `$gemkit/api` 的请求头，跳转时响应 `REDIRECT_HEADER`，而不是 3xx（`fetch` 会自动跟随） */
export const CLIENT_HEADER = 'x-gemkit-client';
export const HTML_TYPE = 'text/html; charset=utf-8';
/** ISR 的页面由 CDN 缓存时，过期后最多返回一年内的旧内容，同时在后台重新渲染 */
export const CDN_STALE_SECONDS = 60 * 60 * 24 * 365;

/** 页面路径对应的数据文件路径 */
export function getDataPath(path: string, file = DATA_FILE) {
  return `${path === '/' ? '' : path}/${file}`;
}

/** 静态托管服务会给目录加上末尾的 `/`，路由不匹配末尾的 `/` */
export function trimTrailingSlash(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
}

/** 转义 HTML 文本和双引号属性值 */
export const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
