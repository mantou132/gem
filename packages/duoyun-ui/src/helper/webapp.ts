import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { utf8ToB64 } from '../lib/encode';

export function getWebManifestURL(manifest: Record<string, unknown>) {
  return `data:application/json;base64,${utf8ToB64(
    JSON.stringify(manifest, (_, value) =>
      typeof value === 'string' && value.startsWith('/') ? new URL(value, location.origin).href : value,
    ),
  )}`;
}

export function initApp({
  serviceWorkerScript,
  initWindowSize,
}: { serviceWorkerScript?: string; initWindowSize?: [number, number] } = {}) {
  if (serviceWorkerScript) {
    navigator.serviceWorker?.register(serviceWorkerScript, { type: 'module' });
  } else {
    navigator.serviceWorker?.getRegistration().then((reg) => reg?.unregister());
  }

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
