import { devtools } from 'webextension-polyfill';

import { configureStore } from './store';
import { preload } from './scripts/preload';

const preloadSource = preload.toString();

/**
 * execution script in page
 * @param func A function that can be converted into a string and does not rely on external variables
 * @param args Array serializable using JSON
 */
export async function execution<Func extends (...rest: any) => any>(
  func: Func,
  args: Parameters<Func>,
  options: Parameters<typeof devtools.inspectedWindow.eval>[1] = {},
): Promise<ReturnType<Func>> {
  const source = func.toString();
  const [data, errorInfo] = await devtools.inspectedWindow.eval(
    `(${preloadSource})();(${source}).apply(null, ${JSON.stringify(args)})`,
    // Firefox not support frameURL: undefined
    JSON.parse(
      JSON.stringify({
        frameURL: configureStore.currentFrameURL || undefined,
        ...options,
      }),
    ),
  );
  if (errorInfo) {
    throw {
      source,
      ...errorInfo,
    };
  }
  return data;
}
