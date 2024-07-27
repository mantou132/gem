import { getThemeProps, getThemeStore, useTheme } from '@mantou/gem/helper/theme';

import { defaultTheme } from './default-theme';

export type Theme = typeof defaultTheme;

export const [theme, updateTheme] = useTheme(defaultTheme);
export const themeStore = getThemeStore(theme);
export const themeProps = getThemeProps(theme);

export function changeTheme(newTheme: Partial<Theme> = {}) {
  updateTheme({ ...getThemeStore(theme), ...newTheme });
}
