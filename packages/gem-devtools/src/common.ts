import { devtools } from 'webextension-polyfill';

/**
 * execution script in page
 * @param func A function that can be converted into a string and does not rely on external variables
 * @param args Array serializable using JSON
 */
export async function execution<Func extends (...rest: any) => any>(
  func: Func,
  args: Parameters<Func>,
): Promise<ReturnType<Func>> {
  const source = func.toString();
  const [data, errorInfo] = await devtools.inspectedWindow.eval(`(${source}).apply(null, ${JSON.stringify(args)})`);
  if (errorInfo) {
    throw {
      source,
      ...errorInfo,
    };
  }
  return data;
}
