import { createTheme, getThemeStore, updateTheme } from '@mantou/gem/helper/theme';

import { defaultTheme } from './default-theme';

export type Theme = typeof defaultTheme;

function generateTheme(theme: Theme) {
  const div = document.createElement('div');
  document.body.append(div);
  const style = getComputedStyle(div);
  const getRGB = (color: string) => {
    div.setAttribute('style', `color: ${color}`);
    const rgb = style.color.match(/rgba?\((\d+,\s\d+,\s\d+)(,\s\d+)?\)/)?.[1];
    if (!rgb) throw new Error(`Not support color: ${color}`);
    return rgb;
  };
  const colors = {
    textColorRGB: getRGB(theme.textColor),
    primaryColorRGB: getRGB(theme.primaryColor),
    noteColorRGB: getRGB(theme.noteColor),
    tipColorRGB: getRGB(theme.tipColor),
    importantColorRGB: getRGB(theme.importantColor),
    warningColorRGB: getRGB(theme.warningColor),
    cautionColorRGB: getRGB(theme.cautionColor),
  };
  div.remove();

  return {
    ...theme,
    ...colors,
  };
}

export const theme = createTheme(generateTheme(defaultTheme));
export const themeStore = getThemeStore(theme);

export function changeTheme(newTheme?: Partial<Theme>) {
  if (newTheme) {
    updateTheme(theme, generateTheme({ ...getThemeStore(theme), ...newTheme }));
  }
}
