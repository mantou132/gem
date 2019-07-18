import { GemElement, html, createStore, updateStore, Store, ifDefined } from '..';

class Theme extends GemElement {
  static observedStores = [];
  theme: Store<object>;
  media: string;
  constructor(theme: Store<object>, media = '') {
    Theme.observedStores = [theme];
    super(false);
    this.theme = theme;
    this.media = media;
  }
  render() {
    const style = `:root {${Object.keys(this.theme).reduce((prev, key) => {
      return prev + `--${key}:${this.theme[key]};`;
    }, '')}}`;
    return html`
      <style media=${ifDefined(this.media || undefined)}>
        ${style}
      </style>
    `;
  }
}
customElements.define('gem-theme', Theme);

type CSSVars<T> = {
  [P in keyof T]: string;
};

const map = new WeakMap<CSSVars<unknown>, Store<unknown>>();

function create<T extends object>(themeObj: T, media?: string) {
  const theme = createStore<T>(themeObj);
  document.head.append(new Theme(theme, media));
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
