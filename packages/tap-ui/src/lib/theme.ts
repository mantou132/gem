import type { Theme } from '@mantou/gem/helper/theme';
import { createTheme, getThemeStore } from '@mantou/gem/helper/theme';

export function getSemanticColor(semantic?: string) {
  switch (semantic) {
    case 'negative':
      return theme.negativeColor;
    case 'positive':
      return theme.positiveColor;
    case 'notice':
      return theme.noticeColor;
    case 'informative':
      return theme.informativeColor;
    case 'neutral':
      return theme.neutralColor;
    case 'transparent':
      return 'transparent';
  }
}

export const lightTheme = {
  colorScheme: 'light',
  primaryColor: '#26c0e3', // https://developer.mozilla.org/en-US/docs/Web/CSS/accent-color
  highlightColor: '#000', // title, etc
  textColor: '#4b4b4b',
  describeColor: '#6e6e6e',
  /**Surface of cards, cells, list rows, navbar and pages */
  backgroundColor: '#fff',
  /**Subtle fill set apart from `backgroundColor`, e.g. placeholder, collapse panel, searchbar */
  lightBackgroundColor: '#fafafa',
  hoverBackgroundColor: '#ededed',
  /**Outline of controls, e.g. input, select, stepper */
  borderColor: '#e1e1e1',
  /**Divider lines, e.g. navbar, tabbar, list rows; drawn with `hairline` width */
  separatorColor: 'rgba(60, 60, 67, 0.29)',
  /**Fill of disabled controls */
  disabledColor: '#eaeaea',
  maskAlpha: '0.2',
  controlShadow: 'none',

  // same of light/dark
  // https://spectrum.adobe.com/page/color/#Semantic-colors
  informativeColor: '#2680eb',
  neutralColor: '#b3b3b3',
  positiveColor: '#2d9d78',
  noticeColor: '#e68619',
  negativeColor: '#e34850',
  focusColor: '#2680eb',
  // https://developer.mozilla.org/en-US/docs/Web/CSS/corner-shape
  cornerShape: 'superellipse(5)',
  /**Width of divider lines, one physical pixel on 2x/3x screens */
  hairline: '0.5px',
  normalRound: '4px',
  smallRound: '2px',
  gridGutter: '24px',
  pageGutter: '1em',
  // +1 user titleBar
  // +2 menu
  // +3 input-capture/keyboard-access
  // max: 2**31 - 1 = 2147483647
  // Firefox 似乎有 Bug？+3 的元素不能覆盖 +2 的元素
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1875557
  popupZIndex: '2147483644',
  timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  timingEasingFunction: 'cubic-bezier(0.16, 1, 0.29, 0.99)',
  font: '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","PingFang SC",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"',
  codeFont: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,monospace',
};

export const darkTheme: Partial<typeof lightTheme> = {
  colorScheme: 'dark',
  primaryColor: '#26c0e3',
  highlightColor: '#efefef',
  textColor: '#c8c8c8',
  describeColor: '#8e8e8e',
  backgroundColor: '#1a1a1a',
  lightBackgroundColor: '#1e1e1e',
  hoverBackgroundColor: '#2f2f2f',
  borderColor: '#313131',
  separatorColor: 'rgba(84, 84, 88, 0.6)',
  disabledColor: '#3a3a3a',
  maskAlpha: '0.4',
};

/**
 * Follows the page's `color-scheme` (e.g. `html { color-scheme: light dark }`) via `light-dark()`,
 * default theme, so values not passed to `extendTheme` also adapt
 */
export const systemTheme = {
  ...lightTheme,
  ...Object.fromEntries(
    Object.entries(darkTheme)
      // 相同的值保持原样，便于派生色 `oklch(from ...)` 使用
      .filter(([key, value]) => key.endsWith('Color') && value !== lightTheme[key as keyof typeof lightTheme])
      .map(([key, value]) => [key, `light-dark(${lightTheme[key as keyof typeof lightTheme]}, ${value})`]),
  ),
  colorScheme: 'light dark',
};

export const theme = createTheme({ ...systemTheme });
export const themeStore = getThemeStore(theme);

export function extendTheme<T extends Record<string, string>>(t: Partial<typeof lightTheme> & T) {
  theme(t);
  return theme as unknown as Theme<typeof lightTheme & T>;
}
