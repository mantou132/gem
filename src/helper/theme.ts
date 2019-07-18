import { connect, createStore, updateStore, Store } from '..';

function replaceStyle(style: HTMLStyleElement, themeObj: Store<object>, media = '') {
  style.media = media;
  style.innerHTML = `:root {${Object.keys(themeObj).reduce((prev, key) => {
    return prev + `--${key}:${themeObj[key]};`;
  }, '')}}`;
}

type CSSVars<T> = {
  [P in keyof T]: string;
};

const map = new WeakMap<CSSVars<unknown>, Store<unknown>>();

function create<T extends object>(themeObj: T, media?: string) {
  const theme = createStore<T>(themeObj);
  const style = document.createElement('style');
  const replace = () => replaceStyle(style, theme, media);
  connect(
    theme,
    replace,
  );
  replace();
  document.head.append(style);
  let themeVarSet = {};
  map.set(themeVarSet, theme);
  Object.keys(theme).forEach(key => {
    themeVarSet[key] = `var(--${key})`;
  });
  return themeVarSet as CSSVars<T>;
}

export function createTheme<T extends object>(mediaOrThemeObj: T | string, themeObj?: T) {
  if (typeof mediaOrThemeObj === 'string') {
    return create(themeObj, mediaOrThemeObj);
  } else {
    return create(mediaOrThemeObj);
  }
}

export function updateTheme(varSet: CSSVars<object>, newThemeObj: object) {
  updateStore(map.get(varSet), newThemeObj);
}
