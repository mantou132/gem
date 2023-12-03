import { Path } from '../store';

export const setValue = (path: Path, value: string | number | boolean | null) => {
  const key = String(path.pop());

  const obj = window.__GEM_DEVTOOLS__PRELOAD__.readProp(path);

  obj[key] = value;
};
