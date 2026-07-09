import { utf8ToB64 } from '../lib/encode';

export function getWebManifestURL(manifest: Record<string, unknown>) {
  return `data:application/json;base64,${utf8ToB64(
    JSON.stringify(manifest, (_, value) =>
      typeof value === 'string' && value.startsWith('/') ? new URL(value, location.origin).href : value,
    ),
  )}`;
}

export interface InitAppOptions {
  serviceWorkerScript?: string;
}

export function initApp({ serviceWorkerScript }: InitAppOptions = {}) {
  if (serviceWorkerScript) {
    navigator.serviceWorker?.register(serviceWorkerScript, { type: 'module' });
  } else {
    navigator.serviceWorker?.getRegistration().then((reg) => reg?.unregister());
  }
}
