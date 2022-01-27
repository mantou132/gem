import { Renderer, parse } from 'marked';

import { getRemotePath } from './utils';

const parser = new DOMParser();
const cache = new Map<string, string>();

export async function fetchDocument({ link, lang, renderer }: { link: string; lang: string; renderer: Renderer }) {
  const mdPath = getRemotePath(link, lang);
  let md = cache.get(mdPath);
  if (!md) {
    md = await (await fetch(mdPath)).text();
    cache.set(mdPath, md);
  }
  const [, , _sToken, _frontmatter, _eToken, mdBody] =
    md.match(/^(([\r\n\s]*---\s*(?:\r\n|\n))(.*?)((?:\r\n|\n)---\s*(?:\r\n|\n)?))?(.*)$/s) || [];

  return [...parser.parseFromString(parse(mdBody, { renderer }), 'text/html').body.children];
}
