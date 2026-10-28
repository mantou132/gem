import { defaultTheme, toThemeProp } from './default-theme';

export type Theme = typeof defaultTheme;

/**
 * 主题的值，CSS 变量在 HTML 模版的 `:root` 中定义（CLI 生成），用户可以覆盖，
 * 不使用 `createTheme`，它的变量名有随机后缀，服务端和客户端不一样，水合后样式会闪烁
 */
export const theme = Object.fromEntries(
  Object.keys(defaultTheme).map((key) => [key, `var(${toThemeProp(key)})`]),
) as Theme;

/**
 * 主色用于文字和按钮时的颜色：主色一般取自 logo，直接用在文字上对比度不够，
 * 向文字颜色混合，浅色背景时变深，深色背景时变浅，混合后饱和度降低，再提高饱和度
 */
export const primaryTextColor = `oklch(from color-mix(in oklch, ${theme.primaryColor}, ${theme.textColor} 50%) l calc(c * 2) h)`;
