import { getTemplateHtml, type TemplateResult } from '@mantou/gem/lib/lit-html';

import { V_ELSE, V_ELSE_IF, V_IF } from '../constants';

/*
 * 编译模板
 *
 * 使用和客户端相同的 `getTemplateHtml` 生成带标记的 HTML，再解析成指令，每个模板只解析一次
 */

const voidElements = /^(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;
const rawTextElements = /^(?:script|style|textarea|title)$/;

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeEntities = (s: string) =>
  s.includes('&')
    ? s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e: string) =>
        e[0] !== '#'
          ? (entities[e.toLowerCase()] ?? m)
          : String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))),
      )
    : s;

type Condition = { kind: typeof V_IF | typeof V_ELSE_IF | typeof V_ELSE; index?: number; chain?: OpenOp[] };

export type BoundAttr = { prefix: string; name: string; strings: string[]; index: number };

export type OpenOp = {
  type: 'open';
  tag: string;
  custom: boolean;
  // 原始文本，没有绑定的 attribute 原样输出
  attrs: { name: string; value: string; raw: string }[];
  bound: BoundAttr[];
  elementParts: number[];
  condition?: Condition;
  close?: CloseOp;
};

type CloseOp = { type: 'close'; open: OpenOp; text: string };

type Op =
  | { type: 'static'; text: string }
  | { type: 'child'; index: number; start: string; end: boolean }
  | { type: 'raw'; tag: string; strings: string[]; index: number }
  | OpenOp
  | CloseOp;

type StackItem = { tag: string; open?: OpenOp; lastElement?: OpenOp };

const templateCache = new WeakMap<TemplateStringsArray, Op[]>();

const nameRe = /[^\s"'>/=]+/y;
const valueRe = /\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/y;
const spaceRe = /[\s/]*/y;

const execAt = (re: RegExp, str: string, pos: number) => {
  re.lastIndex = pos;
  return re.exec(str);
};

export function compile({ strings, type }: TemplateResult): Op[] {
  const cached = templateCache.get(strings);
  if (cached) return cached;

  const [trustedHtml, attrNames] = getTemplateHtml(strings, type as any);
  let html = trustedHtml as unknown as string;
  // 去掉 svg/mathml 的包裹元素
  const wrapper = type === 2 ? 'svg' : type === 3 ? 'math' : '';
  if (wrapper) html = html.slice(wrapper.length + 2, -(wrapper.length + 3));
  const marker = html.match(/lit\$\d+\$/)?.[0];

  const ops: Op[] = [];
  const stack: StackItem[] = [{ tag: wrapper }];
  let attrNameIndex = 0;
  let valueIndex = 0;
  let pos = 0;

  const pushStatic = (text: string) => {
    if (!text) return;
    const last = ops.at(-1);
    if (last?.type === 'static') last.text += text;
    else ops.push({ type: 'static', text });
  };

  const parseOpenTag = (start: number) => {
    const tag = execAt(nameRe, html, start + 1)![0].toLowerCase();
    const op: OpenOp = { type: 'open', tag, custom: tag.includes('-'), attrs: [], bound: [], elementParts: [] };
    pos = start + 1 + tag.length;
    while (true) {
      pos += execAt(spaceRe, html, pos)![0].length;
      if (html[pos] === '>' || pos >= html.length) break;
      const name = execAt(nameRe, html, pos)?.[0];
      if (!name) {
        pos++;
        continue;
      }
      const attrStart = pos;
      pos += name.length;
      const valueMatch = execAt(valueRe, html, pos);
      let value = '';
      if (valueMatch) {
        pos += valueMatch[0].length;
        value = valueMatch[1] ?? valueMatch[2] ?? valueMatch[3];
      }
      if (name.endsWith('$lit$')) {
        const [, prefix = '', realName] = /^([.?@])?(.*)$/.exec(attrNames[attrNameIndex++])!;
        const statics = value.split(marker!).map(decodeEntities);
        op.bound.push({ prefix, name: realName, strings: statics, index: valueIndex });
        valueIndex += statics.length - 1;
        if (realName === V_IF || realName === V_ELSE_IF) op.condition = { kind: realName, index: valueIndex - 1 };
      } else if (marker && name.startsWith(marker)) {
        op.elementParts.push(valueIndex++);
      } else if (name.toLowerCase() === V_ELSE) {
        op.condition = { kind: V_ELSE };
      } else {
        op.attrs.push({ name: name.toLowerCase(), value: decodeEntities(value), raw: html.slice(attrStart, pos) });
      }
    }
    const selfClosing = html[pos - 1] === '/';
    pos++;

    const parent = stack.at(-1)!;
    const prev = parent.lastElement;
    parent.lastElement = op;
    // 和 `ConditionChain` 一样，条件链由相邻的元素组成
    if (op.condition?.kind === V_IF) {
      op.condition.chain = [op];
    } else if (op.condition && prev?.condition?.chain && prev.condition.kind !== V_ELSE) {
      op.condition.chain = prev.condition.chain;
      op.condition.chain.push(op);
    } else {
      op.condition = undefined;
    }

    const isForeign = stack.some((e) => e.tag === 'svg' || e.tag === 'math');
    const hasEnd = !voidElements.test(tag) && !(selfClosing && (isForeign || tag === 'svg' || tag === 'math'));
    const isDynamic = op.custom || op.condition || op.bound.length || op.elementParts.length;
    if (isDynamic) {
      ops.push(op);
    } else {
      pushStatic(html.slice(start, pos));
    }
    if (hasEnd) stack.push({ tag, open: isDynamic ? op : undefined });

    if (hasEnd && rawTextElements.test(tag)) {
      const end = html.slice(pos).search(new RegExp(`</${tag}`, 'i'));
      const content = html.slice(pos, end === -1 ? undefined : pos + end);
      const parts = marker ? content.split(marker) : [content];
      if (parts.length > 1) {
        ops.push({ type: 'raw', tag, strings: parts, index: valueIndex });
        valueIndex += parts.length - 1;
      } else {
        pushStatic(content);
      }
      pos += content.length;
    }
  };

  const closeTag = (start: number) => {
    const end = html.indexOf('>', start) + 1 || html.length;
    const tag = execAt(nameRe, html, start + 2)?.[0].toLowerCase();
    const text = html.slice(start, end);
    pos = end;
    const index = stack.findLastIndex((e) => e.tag === tag);
    if (index < 1) return pushStatic(text);
    const { open } = stack[index];
    stack.length = index;
    if (!open) return pushStatic(text);
    open.close = { type: 'close', open, text };
    ops.push(open.close);
  };

  while (pos < html.length) {
    const lt = html.indexOf('<', pos);
    if (lt === -1) {
      pushStatic(html.slice(pos));
      break;
    }
    pushStatic(html.slice(pos, lt));
    pos = lt;
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      pos = end === -1 ? html.length : end + 3;
      const text = html.slice(lt, pos);
      // 注释中的绑定不起作用，但是占用值
      if (marker) valueIndex += text.split(marker).length - 1;
      pushStatic(text);
    } else if (html[lt + 1] === '?') {
      // `<?lit$123$>` 和 `<?>` 解析成注释
      pos = html.indexOf('>', lt) + 1;
      const data = html.slice(lt + 1, pos - 1);
      if (data === `?${marker}`) {
        // 后面有兄弟节点时，ChildPart 有 endNode，需要输出结束标记
        const next = html.slice(pos);
        const end = !!next && !/^<\/[a-z]/i.test(next);
        ops.push({ type: 'child', index: valueIndex++, start: `<!--${data}-->`, end });
      } else {
        pushStatic(`<!--${data}-->`);
      }
    } else if (/^<\/[a-z]/i.test(html.slice(lt, lt + 3))) {
      closeTag(lt);
    } else if (/^<[a-z]/i.test(html.slice(lt, lt + 2))) {
      parseOpenTag(lt);
    } else {
      pushStatic('<');
      pos = lt + 1;
    }
  }

  templateCache.set(strings, ops);
  return ops;
}
