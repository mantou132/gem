import { NavItem } from '../../common/config';
import { bookStore } from '../store';

export type NavItemWithLink = NavItem & {
  originLink: string;
  userFullPath: string;
  children?: NavItemWithLink[];
};

export function capitalize(str: string) {
  return str.replace(/^\w/, (s: string) => s.toUpperCase());
}

export function getRanges(str: string, lines: string[]) {
  const len = lines.length;
  const findLineNumber = (s: string, start = 1) => {
    if (!s.trim()) return 0;
    return lines.findIndex((line, index) => index >= start - 1 && line.includes(s)) + 1;
  };
  const ranges = str.split(',').map((range) => {
    // 第二位可以省略，第一位不行，0 无意义，解析数字忽略空格，字符匹配包含空格
    // 3-4
    // 2 => 2-2
    // 2-2 => 2-2 // 使用字符串搜索时 end 大于 start
    // 2- => 2-max
    // -2 => (-2)-(-2)
    // -2- => (-2)-max
    // 2--2 => 2-(-2)
    // -3--2 => (-3)-(-2)
    const [startStr, endStr = startStr] = range.split(/(?<!-|^)-/);
    const start = Number(startStr) || findLineNumber(startStr) || 1;
    // 如果使用字符匹配，认为输入是严格顺序的，所以结束是在 start 后搜索
    const end = Number(endStr) || findLineNumber(endStr, endStr === startStr ? start : start + 1) || -1;
    // 包含首尾
    return [start < 0 ? len + start + 1 : start, end < 0 ? len + end + 1 : end || len].sort((a, b) => a - b);
  });
  const result: number[][] = [];
  ranges
    .sort((a, b) => a[0] - b[0])
    .forEach((range, index, arr) => {
      const prev = arr[index - 1];
      // 连号时并入前一个 range
      if (prev && prev[1] + 1 === range[0]) {
        prev[1] = range[1];
      } else {
        result.push(range);
      }
    });
  return result;
}

export function getParts(lines: string[], ranges: number[][]) {
  const lineNumbersParts = Array.from<unknown, number[]>(ranges, () => []);
  const parts = ranges.map(([start, end], index) => {
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const j = start + i - 1;
      lineNumbersParts[index].push(j + 1);
      return lines[j];
    }).join('\n');
  });
  return { parts, lineNumbersParts };
}

// type error
export function flatNav(nav: NavItem[]): NavItemWithLink[] {
  return nav
    .map((item) => {
      if (item.type === 'dir') return item.children ? flatNav(item.children) : [];
      return item as NavItemWithLink;
    })
    .flat();
}

export function joinPath(...paths: (string | undefined)[]) {
  const toPath = (part: string) => (part.startsWith('/') ? part : part ? `/${part}` : '');
  return paths.reduce<string>((base = '', path = '') => {
    return `${toPath(base)}${toPath(path)}`;
  }, '');
}

export function getGithubPath(link: string) {
  const { config, lang } = bookStore;
  const { sourceDir, base } = config || {};
  return joinPath(base, sourceDir !== '.' ? sourceDir : '', lang, link);
}

export function getURL(originPath: string, hash = '') {
  return `${originPath}?hash=${hash}`;
}

export function isSameOrigin(link: string) {
  const { origin } = new URL(link, location.origin);
  return origin === location.origin;
}

const div = document.createElement('div');
export function escapeHTML(s: string) {
  div.textContent = s;
  return div.innerHTML;
}

export function textContent(s: string) {
  div.innerHTML = s;
  return div.textContent || '';
}

export function checkBuiltInPlugin(container: HTMLElement) {
  const tagSet = new Set([...container.querySelectorAll(`:not(:defined)`)].map((e) => e.tagName.toLowerCase()));
  tagSet.forEach((tag) => {
    const [namespace, ...rest] = tag.split('-');
    if (namespace === 'gbp' && rest.length) {
      window.dispatchEvent(new CustomEvent('plugin', { detail: rest.join('-') }));
    }
  });
}

export function isGitLab() {
  const { config } = bookStore;
  return config?.github && !new URL(config.github).host.endsWith('github.com');
}
