export function getBody(md = '') {
  const [, , _sToken, _frontmatter, _eToken, mdBody = ''] =
    md.match(/^(([\r\n\s]*---\s*(?:\r\n|\n))(.*?)((?:\r\n|\n)---\s*(?:\r\n|\n)?))?(.*)$/s) || [];
  return mdBody;
}

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

export function debounce<T extends (...args: any) => any>(func: T, wait = 100) {
  let lastTimeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) =>
    new Promise<Awaited<ReturnType<typeof func>>>((resolve, reject) => {
      if (lastTimeout) {
        clearTimeout(lastTimeout);
      }
      lastTimeout = setTimeout(() => {
        lastTimeout = null;
        Promise.resolve(func(...(args as any)))
          .then(resolve)
          .catch(reject);
      }, wait);
    });
}

export function throttle<T extends (...args: any) => any>(fn: T, wait = 1000) {
  let timer: ReturnType<typeof setTimeout> | number = 0;
  return (...rest: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...(rest as any));
      timer = 0;
    }, wait);
  };
}
