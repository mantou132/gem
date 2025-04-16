import { createTheme } from '@mantou/gem/helper/theme';
import { devtools } from 'webextension-polyfill';

const lightTheme = {
  backgroundColorRGB: '255,255,255',
  textColorRGB: '0,0,0',
  nameColor: '#75bfff',
  valueColor: '#999',
  stringValueColor: '#ff7de9',
  numberValueColor: '#86de74',
  booleanValueColor: '#86de74',
  objectValueColor: '#75bfff',
  functionValueColor: '#75bfff',
  elementValueColor: '#ba77b4',
};
const darkTheme = {
  backgroundColorRGB: '25,25,25',
  textColorRGB: '225,225,225',
};

export const theme = createTheme(lightTheme);

const update = () => {
  const isDark = devtools.panels.themeName === 'dark';
  theme(isDark ? darkTheme : lightTheme);
};

update();
devtools.panels.onThemeChanged?.addListener(update);
