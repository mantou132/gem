import { i18n } from '$gemkit/i18n';

const TRANSLATE_URL = 'https://translate.709922234.workers.dev';

// 同一个文档只翻译一次，开发时也不会每次请求都翻译
const cache = new Map<string, Promise<string>>();

/** 去掉一级标题后没有内容的文档是还没有翻译的文档 */
export const isUntranslated = (body: string) => !body.replace(/^\s*#\s.*$/m, '').trim();

/** 在一级标题后插入提示 */
const addNotice = (md: string, notice: string) => md.replace(/^(\s*#\s.*)$/m, `$1\n\n> [!WARNING]\n> ${notice}\n`);

/**
 * 机器翻译默认语言的文档，失败时显示原文和未翻译的提示
 */
export function translate(md: string, sourceLang: string, targetLang: string) {
  const key = `${sourceLang}:${targetLang}:${md}`;
  let result = cache.get(key);
  if (!result) {
    result = fetch(TRANSLATE_URL, {
      method: 'POST',
      body: JSON.stringify({ text: md, sourceLang, targetLang }),
      signal: AbortSignal.timeout(60_000),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(res.statusText);
        const { content } = (await res.json()) as { content: string };
        return addNotice(content, i18n.get('machineTranslated'));
      })
      .catch(() => {
        // 失败后下次重试
        cache.delete(key);
        return addNotice(md, i18n.get('untranslated'));
      });
    cache.set(key, result);
  }
  return result;
}
