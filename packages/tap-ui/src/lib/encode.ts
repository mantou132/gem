import { pseudoRandom } from './number';

function safeUrlToBase64Str(str: string) {
  return str.replaceAll('-', '+').replaceAll('_', '/');
}

// https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
export function b64ToUtf8(str: string) {
  return decodeURIComponent(
    self
      .atob(safeUrlToBase64Str(str))
      .split('')
      .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
      .join(''),
  );
}

export function base64ToArrayBuffer(str: string): ArrayBuffer {
  const base64 = safeUrlToBase64Str(str);
  if ('fromBase64' in Uint8Array && typeof Uint8Array.fromBase64 === 'function') {
    return Uint8Array.fromBase64(base64).buffer;
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function base64ToSafeUrl(str: string) {
  return str.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/**Converted string to Base64, `isSafe` indicates URL safe */
export function utf8ToB64(str: string, isSafe?: boolean) {
  const base64 = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(Number(`0x${p1}`))),
  );
  return isSafe ? base64ToSafeUrl(base64) : base64;
}

// https://github.com/tc39/proposal-arraybuffer-base64
export function arrayBufferToBase64(arrayBuffer: ArrayBufferLike, isSafe?: boolean): string {
  const bytes = new Uint8Array(arrayBuffer);
  if ('toBase64' in bytes && typeof bytes.toBase64 === 'function') {
    return bytes.toBase64({ alphabet: isSafe ? 'base64url' : 'base64', omitPadding: !!isSafe });
  }
  let base64 = '';
  // Bound the spread arguments; complete three-byte groups concatenate without padding.
  for (let offset = 0; offset < bytes.length; offset += 32766) {
    base64 += btoa(String.fromCharCode(...bytes.subarray(offset, offset + 32766)));
  }
  return isSafe ? base64ToSafeUrl(base64) : base64;
}

/**Must be async */
export async function hash(strOrAb: string | ArrayBuffer, options?: 'string'): Promise<string>;
export async function hash(strOrAb: string | ArrayBuffer, output: 'arrayBuffer'): Promise<ArrayBuffer>;
export async function hash(strOrAb: string | ArrayBuffer, output: 'string' | 'arrayBuffer' = 'string') {
  const ab = typeof strOrAb === 'string' ? new TextEncoder().encode(strOrAb) : strOrAb;
  const buffer = await crypto.subtle.digest('SHA-1', ab);
  if (output === 'arrayBuffer') return buffer;
  return [...new Uint8Array(buffer)].map((e) => e.toString(16).padStart(2, '0')).join('');
}

// https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
/**Simple hash, output int */
export function fnv1a(str: string) {
  const FNV_OFFSET_BASIS = 2166136261;
  const FNV_PRIME = 16777619;

  let v = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i++) {
    v ^= str.charCodeAt(i);
    v *= FNV_PRIME;
  }

  // 减少连续性
  return pseudoRandom(Math.abs(v))();
}
