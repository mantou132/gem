// 服务端和客户端共享

import type { TemplateResult } from '@mantou/gem/lib/lit-html';

const { imul } = Math;

/** cyrb53 */
export function hash(str: string) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = imul(h1 ^ ch, 2654435761);
    h2 = imul(h2 ^ ch, 1597334677);
  }
  h1 = imul(h1 ^ (h1 >>> 16), 2246822507) ^ imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = imul(h2 ^ (h2 >>> 16), 2246822507) ^ imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const digests = new WeakMap<TemplateStringsArray, string>();

/** 模板的摘要，水合时用来判断服务端和客户端渲染的是不是同一个模板 */
export function getTemplateDigest({ type, strings }: TemplateResult) {
  let digest = digests.get(strings);
  if (!digest) {
    digest = hash(`${type}:${strings.join('\0')}`);
    digests.set(strings, digest);
  }
  return digest;
}
