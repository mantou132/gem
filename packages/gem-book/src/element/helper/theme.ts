import { createTheme, getThemeProps, getThemeStore } from '@mantou/gem/helper/theme';

import { defaultTheme } from './default-theme';

export type Theme = typeof defaultTheme;

export const theme = createTheme(defaultTheme);
export const themeStore = getThemeStore(theme);
export const themeProps = getThemeProps(theme);

export function changeTheme(newTheme: Partial<Theme> = {}) {
  theme({ ...getThemeStore(theme), ...newTheme });
}
