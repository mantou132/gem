import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { initApp as initTapApp, type InitAppOptions as TapInitAppOptions } from 'tap-ui/helper/webapp';

export { getWebManifestURL } from 'tap-ui/helper/webapp';

interface InitAppOptions extends TapInitAppOptions {
  initWindowSize?: [number, number];
}

export function initApp(options: InitAppOptions = {}) {
  initTapApp(options);
  const { initWindowSize } = options;

  // Installed
  if (initWindowSize) {
    matchMedia(mediaQuery.PWA).addEventListener('change', ({ matches }) => {
      if (matches) {
        const w = initWindowSize[0];
        const h = initWindowSize[1];
        resizeTo(w, h);
        moveTo((screen.width - w) / 2, (screen.height - h) / 2);
      }
    });
  }
}
