import { createTheme, getThemeStore, updateTheme as changeTheme } from '@mantou/gem/helper/theme';

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
  }
}

export const lightTheme = {
  primaryColor: '#000', // https://developer.mozilla.org/en-US/docs/Web/CSS/accent-color
  highlightColor: '#000', // title, etc
  textColor: '#4b4b4b',
  describeColor: '#6e6e6e',
  backgroundColor: '#fff',
  lightBackgroundColor: '#fafafa',
  hoverBackgroundColor: '#ededed',
  borderColor: '#e1e1e1',
  disabledColor: '#eaeaea',
  maskAlpha: '0.2',

  // same of light/dark
  // https://spectrum.adobe.com/page/color/#Semantic-colors
  informativeColor: '#2680eb',
  neutralColor: '#b3b3b3',
  positiveColor: '#2d9d78',
  noticeColor: '#e68619',
  negativeColor: '#e34850',
  focusColor: '#2680eb',
  normalRound: '4px',
  smallRound: '2px',
  gridGutter: '24px',
  popupZIndex: '9999999999999',
  timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  timingEasingFunction: 'cubic-bezier(0.16, 1, 0.29, 0.99)',
};

export const darkTheme: Partial<typeof lightTheme> = {
  primaryColor: '#efefef',
  highlightColor: '#efefef',
  textColor: '#c8c8c8',
  describeColor: '#616161',
  backgroundColor: '#1a1a1a',
  lightBackgroundColor: '#1e1e1e',
  hoverBackgroundColor: '#2f2f2f',
  borderColor: '#313131',
  disabledColor: '#5b5b5b',
  maskAlpha: '0.4',
};

export const theme = createTheme({ ...lightTheme });

export const updateTheme = (tm: Partial<typeof lightTheme>) => {
  changeTheme(theme, tm);
};

export const themeStore = getThemeStore(theme);
