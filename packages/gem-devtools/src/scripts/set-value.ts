import { Path } from '../store';

declare let $0: any;

export const setGemPropValue = (path: Path, value: string | number | boolean | null) => {
  const key = String(path.pop());

  const obj = window.__GEM_DEVTOOLS__PRELOAD__.readProp(path);

  obj[key] = value;

  $0.update();
};
