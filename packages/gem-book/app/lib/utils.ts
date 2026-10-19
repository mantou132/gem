/** 文档文件名和链接的转换 */

export function parseTitle(fullText: string) {
  const [, text, customId] = fullText.match(/^(.*?)\s*(?:{#(.*)})?$/s)!;
  return { text, customId };
}

export function normalizeId(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replaceAll('<', '').replaceAll('>', '');
}

export function parseFilename(filename: string) {
  const [, rank, title] = filename.match(/^(\d*-)?(.*)/) || [];
  return { rank, title };
}

export function isIndexFile(filename: string) {
  return /^(index|readme)\.md$/i.test(filename);
}

// 001-xxx.md => /xxx
export function getLinkPath(originPath: string, displayRank?: boolean) {
  const path = encodeURI(originPath.replace(/\.md$/i, ''));
  return displayRank
    ? path
    : path
        .split('/')
        .map((part) => parseFilename(part).title)
        .join('/');
}

// /001-xxx.md => /xxx
// /readme.md => /
export function getUserLink(originPath: string, displayRank?: boolean) {
  const parts = originPath.split('/');
  const filename = parts.pop() || '';
  if (isIndexFile(filename)) {
    return getLinkPath(`${parts.join('/')}/`, displayRank);
  } else {
    return getLinkPath(originPath, displayRank);
  }
}

/** 配置的全局变量，`name` 可以是路径，例如 `pkg.version`，没有时返回 `name` */
export const getGlobal = (name: string) =>
  String(name.split('.').reduce<any>((obj, key) => obj?.[key], __GEM_BOOK_GLOBAL__) ?? name);
