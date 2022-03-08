// https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
export function b64ToUtf8(str: string) {
  return decodeURIComponent(atob(str));
}

export function utf8ToB64(str: string) {
  return btoa(encodeURIComponent(str));
}

// https://github.com/tc39/proposal-arraybuffer-base64
export function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
}

export function base64ToArrayBuffer(s: string) {
  return new Uint8Array([...atob(s)].map((char) => char.charCodeAt(0))).buffer;
}

export async function hash(strOrAb: string | ArrayBuffer, options?: 'string'): Promise<string>;
export async function hash(strOrAb: string | ArrayBuffer, output: 'arrayBuffer'): Promise<ArrayBuffer>;
export async function hash(strOrAb: string | ArrayBuffer, output: 'string' | 'arrayBuffer' = 'string') {
  const ab = typeof strOrAb === 'string' ? new TextEncoder().encode(strOrAb) : strOrAb;
  const buffer = await crypto.subtle.digest('SHA-1', ab);
  if (output === 'arrayBuffer') return buffer;
  return [...new Uint8Array(buffer)].map((e) => e.toString(16).padStart(2, '0')).join('');
}
