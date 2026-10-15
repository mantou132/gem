export const DATA_SCRIPT_ID = 'gemkit-data';
export const DATA_FILE = '__data.json';
/** 预渲染的页面中纯服务端元素的 HTML，客户端导航时使用 */
export const ELEMENTS_FILE = '__elements.json';
/** 渲染纯服务端元素（POST），没有预渲染的元素时使用，例如交互后才出现的元素 */
export const ELEMENT_PATH = '/__gemkit_element';
/** 客户端导航时数据请求的响应头，服务端 `load` 中跳转的地址 */
export const REDIRECT_HEADER = 'x-gemkit-redirect';
/** 客户端导航时数据请求的响应头，服务端 `load` 中调用了 `notFound()` 的路由的标签名 */
export const NOT_FOUND_HEADER = 'x-gemkit-not-found';

/** 页面路径对应的数据文件路径 */
export function getDataPath(path: string, file = DATA_FILE) {
  return `${path === '/' ? '' : path}/${file}`;
}

/** 静态托管服务会给目录加上末尾的 `/`，路由不匹配末尾的 `/` */
export function trimTrailingSlash(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
}
