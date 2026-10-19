import { defaultTheme, toThemeProp } from './default-theme';

export type Theme = typeof defaultTheme;

/**
 * 主题的值，CSS 变量在 HTML 模版的 `:root` 中定义（CLI 生成），用户可以覆盖，
 * 不使用 `createTheme`，它的变量名有随机后缀，服务端和客户端不一样，水合后样式会闪烁
 */
export const theme = Object.fromEntries(
  Object.keys(defaultTheme).map((key) => [key, `var(${toThemeProp(key)})`]),
) as Theme;
