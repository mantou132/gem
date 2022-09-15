function safeUrlToBase64Str(str: string) {
  return str.replaceAll('-', '+').replaceAll('_', '/');
}

// https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
export function b64ToUtf8(str: string) {
  return decodeURIComponent(
    window
      .atob(safeUrlToBase64Str(str))
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
}

export function base64ToArrayBuffer(str: string) {
  return new Uint8Array([...window.atob(safeUrlToBase64Str(str))].map((char) => char.charCodeAt(0))).buffer;
}

function base64ToSafeUrl(str: string) {
  return str.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function utf8ToB64(str: string) {
  return base64ToSafeUrl(
    window.btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(Number(`0x${p1}`)))),
  );
}

// https://github.com/tc39/proposal-arraybuffer-base64
export function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  return base64ToSafeUrl(window.btoa(String.fromCharCode(...new Uint8Array(arrayBuffer))));
}

export async function hash(strOrAb: string | ArrayBuffer, options?: 'string'): Promise<string>;
export async function hash(strOrAb: string | ArrayBuffer, output: 'arrayBuffer'): Promise<ArrayBuffer>;
export async function hash(strOrAb: string | ArrayBuffer, output: 'string' | 'arrayBuffer' = 'string') {
  const ab = typeof strOrAb === 'string' ? new TextEncoder().encode(strOrAb) : strOrAb;
  const buffer = await crypto.subtle.digest('SHA-1', ab);
  if (output === 'arrayBuffer') return buffer;
  return [...new Uint8Array(buffer)].map((e) => e.toString(16).padStart(2, '0')).join('');
}
