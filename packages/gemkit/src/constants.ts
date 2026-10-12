export const DATA_SCRIPT_ID = 'gemkit-data';
export const DATA_FILE = '__data.json';

/** 页面路径对应的数据文件路径 */
export function getDataPath(path: string) {
  return `${path === '/' ? '' : path}/${DATA_FILE}`;
}

/** 静态托管服务会给目录加上末尾的 `/`，路由不匹配末尾的 `/` */
export function trimTrailingSlash(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
}
