// 必须在 Gem 之前执行，用来模拟 DOM 环境
import './lib/shim';

import { type GemElement, history, SheetToken, type Store, setHydrationEngine } from '@mantou/gem';
import { GemLightRouteElement } from '@mantou/gem/elements/route';
import { createRef, getTemplateHtml, TemplateResult } from '@mantou/gem/lib/lit-html';

import { STORES_SCRIPT_ID } from './client/store';
import { LIT_PART_END, SSR_HIDDEN, SSR_STYLE, V_ELSE, V_ELSE_IF, V_IF } from './constants';
import { SSR_STATE, ssrContext } from './decorators';
import { runInRequest, setLocation } from './lib/shim';

export { runInRequest };

// 元素渲染的模板，key 是渲染容器
const renderedTemplates = new WeakMap<object, unknown>();
setHydrationEngine((value, container) => {
  renderedTemplates.set(container, value);
  // 返回真值，跳过 DOM 渲染
  return {} as any;
});

const ROOT_MARKER = '<!---->';
const END_MARKER = `<!--${LIT_PART_END}-->`;

const voidElements = /^(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;
const rawTextElements = /^(?:script|style|textarea|title)$/;
const escapableRawTextElements = /^(?:textarea|title)$/;

const escapeText = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeAttr = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeEntities = (s: string) =>
  s.includes('&')
    ? s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e: string) =>
        e[0] !== '#'
          ? (entities[e.toLowerCase()] ?? m)
          : String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))),
      )
    : s;

/*
 * 编译模板
 *
 * 使用和客户端相同的 `getTemplateHtml` 生成带标记的 HTML，再解析成指令，每个模板只解析一次
 */

type Condition = { kind: typeof V_IF | typeof V_ELSE_IF | typeof V_ELSE; index?: number; chain?: OpenOp[] };

type BoundAttr = { prefix: string; name: string; strings: string[]; index: number };

type OpenOp = {
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

function compile({ strings, type }: TemplateResult): Op[] {
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

/*
 * 渲染
 *
 * 输出是字符串和 Promise 组成的树，异步内容不阻塞后面的同步内容，输出时按顺序等待
 */

type Piece = string | Promise<Piece[]>;

type Context = {
  out: Piece[];
  // 元素实例的父节点，例如 `<gemkit-outlet>` 需要向上查找
  parent: { append(node: unknown): void };
  // 已经输出的 light DOM 样式表，每个 ShadowRoot 有自己的样式表
  sheets: Set<unknown>;
  // 在隐藏的条件分支中，元素不会挂载
  hidden: boolean;
};

type DirectiveResult = {
  _$litDirective$: new (partInfo: object) => { render(...values: unknown[]): unknown };
  values: unknown[];
};

const Ref = createRef().constructor;

const isDirectiveResult = (value: unknown): value is DirectiveResult =>
  !!value && typeof value === 'object' && '_$litDirective$' in value;

function resolveDirective(value: unknown, partInfo: object): unknown {
  if (!isDirectiveResult(value)) return value;
  const directive = new value._$litDirective$(partInfo);
  return resolveDirective(directive.render(...value.values), partInfo);
}

const childPartInfo = { type: 2 };

function renderValue(value: unknown, ctx: Context) {
  value = resolveDirective(value, childPartInfo);
  if (value === null || value === undefined || value === '') return;
  if (value instanceof TemplateResult) return renderTemplate(value, ctx);
  if (typeof value === 'object' && Symbol.iterator in value) {
    // 列表项都有首尾标记
    for (const item of value as Iterable<unknown>) {
      ctx.out.push(ROOT_MARKER);
      renderValue(item, ctx);
      ctx.out.push(ROOT_MARKER);
    }
    return;
  }
  ctx.out.push(escapeText(String(value)));
}

function getBoundValue({ prefix, name, strings, index }: BoundAttr, values: unknown[], tagName: string) {
  const partInfo = { type: prefix === '.' ? 3 : prefix === '?' ? 4 : prefix === '@' ? 5 : 1, name, strings, tagName };
  if (strings.length === 2 && strings[0] === '' && strings[1] === '') return resolveDirective(values[index], partInfo);
  // 多个值组成的 attribute，有空值时移除 attribute
  let result: string | undefined = strings[0];
  for (let i = 0; i < strings.length - 1; i++) {
    const v = resolveDirective(values[index + i], partInfo);
    if (v === null || v === undefined) result = undefined;
    else if (result !== undefined) result += v + strings[i + 1];
  }
  return result;
}

type Attrs = Map<string, string>;

// 和 `ConditionChain` 一样，显示第一个满足条件的分支
function isHiddenBranch({ condition }: OpenOp, values: unknown[]) {
  if (!condition) return false;
  const shown = condition.chain!.find((e) => e.condition!.index === undefined || !!values[e.condition!.index]);
  return shown?.condition !== condition;
}

// 输出所有分支，客户端根据这些 attribute 构建条件链，并移除隐藏的分支
function setConditionAttrs({ condition }: OpenOp, hidden: boolean, attrs: Attrs) {
  if (condition?.kind === V_ELSE) attrs.set(V_ELSE, '');
  if (!hidden) return;
  const style = attrs.get('style') ?? '';
  attrs.set('style', 'display:none');
  attrs.set(SSR_HIDDEN, style);
}

const serializeAttrs = (attrs: Attrs) => {
  let result = '';
  for (const [name, value] of attrs) result += ` ${name}="${escapeAttr(value)}"`;
  return result;
};

function getElementAttrs(element: Element) {
  const attrs: Attrs = new Map();
  for (const name of element.getAttributeNames()) attrs.set(name, element.getAttribute(name)!);
  return attrs;
}

function renderPlainElement(op: OpenOp, values: unknown[], ctx: Context) {
  let raw = `<${op.tag}`;
  const attrs: Attrs = new Map();
  for (const { name, value } of op.attrs) attrs.set(name, value);
  for (const bound of op.bound) {
    if (bound.name === V_IF || bound.name === V_ELSE_IF) continue;
    const value = getBoundValue(bound, values, op.tag);
    if (bound.prefix === '?') {
      if (value) attrs.set(bound.name, '');
    } else if (!bound.prefix && value !== null && value !== undefined) {
      attrs.set(bound.name, String(value));
    }
  }
  const hidden = isHiddenBranch(op, values);
  setConditionAttrs(op, hidden, attrs);
  // 没有改变的 attribute 原样输出
  if (attrs.size === op.attrs.length) {
    for (const { raw: text } of op.attrs) raw += ` ${text}`;
    raw += '>';
  } else {
    raw += `${serializeAttrs(attrs)}>`;
  }
  ctx.out.push(raw);
  return hidden;
}

type ElementFrame = {
  op: OpenOp;
  element: GemElement;
  // 隐藏的条件分支中的元素不会挂载
  hidden: boolean;
  conditionHidden: boolean;
  task?: Promise<unknown>;
  parentCtx: Context;
};

// 路由内部捕获了加载错误，SSR 时应该渲染失败
function loadRoute(route: GemLightRouteElement) {
  let error: { err: unknown } | undefined;
  const onError = (evt: Event) => (error = { err: (evt as CustomEvent).detail });
  route.addEventListener('error', onError);
  return route.update().finally(() => {
    route.removeEventListener('error', onError);
    if (error) throw error.err;
  });
}

function createElement(Element: CustomElementConstructor, op: OpenOp, values: unknown[], ctx: Context) {
  const element = new Element() as GemElement;
  ctx.parent.append(element);
  for (const { name, value } of op.attrs) element.setAttribute(name, value);
  for (const bound of op.bound) {
    if (bound.name === V_IF || bound.name === V_ELSE_IF) continue;
    const value = getBoundValue(bound, values, op.tag);
    if (bound.prefix === '.') (element as any)[bound.name] = value;
    else if (bound.prefix === '?') element.toggleAttribute(bound.name, !!value);
    else if (!bound.prefix && value !== null && value !== undefined) element.setAttribute(bound.name, String(value));
  }
  for (const index of op.elementParts) {
    const value = values[index];
    if (value instanceof Ref) (value as { value: unknown }).value = element;
    else if (value && typeof value === 'object') Object.assign(element, value);
  }
  const conditionHidden = isHiddenBranch(op, values);
  const frame: ElementFrame = { op, element, hidden: ctx.hidden || conditionHidden, conditionHidden, parentCtx: ctx };
  if (frame.hidden) {
    ssrContext.tasks.delete(element);
    return frame;
  }
  // 渲染出错时抛出错误，`@fallback` 处理了错误时不会抛出
  element.connectedCallback();
  const tasks = ssrContext.tasks.get(element);
  ssrContext.tasks.delete(element);
  if (tasks) ssrContext.stateElements.add(element);
  // 服务端不执行副作用，所以手动加载路由
  const route = element instanceof GemLightRouteElement ? loadRoute(element) : undefined;
  if (tasks || route) frame.task = Promise.all([...(tasks || []).map((fn) => fn()), route]);
  return frame;
}

function getStyle(sheets: Iterable<any>, attrs = '') {
  let result = '';
  for (const sheet of sheets) {
    const media = sheet.media?.mediaText;
    result += `<style${attrs}${media ? ` media="${escapeAttr(media)}"` : ''}>${sheet.cssText}</style>`;
  }
  return result;
}

const getShadowRootAttrs = (shadowRoot: ShadowRoot) =>
  serializeAttrs(
    new Map([
      ['shadowrootmode', shadowRoot.mode],
      ...(shadowRoot.delegatesFocus ? [['shadowrootdelegatesfocus', '']] : []),
      ...(shadowRoot.serializable ? [['shadowrootserializable', '']] : []),
      ...(shadowRoot.clonable ? [['shadowrootclonable', '']] : []),
      ...(shadowRoot.slotAssignment === 'manual' ? [['shadowrootslotassignment', 'manual']] : []),
    ] as [string, string][]),
  );

// light DOM 的样式表在每个渲染根中第一次出现时输出到元素中
function getLightStyle(element: GemElement, { sheets }: Context) {
  const metadata = (element.constructor as any)[Symbol.metadata];
  const list = [...element.internals.sheets];
  for (const item of metadata?.adoptedStyleSheets || []) {
    const sheet = item[SheetToken].getStyle(element);
    if (sheets.has(sheet)) continue;
    sheets.add(sheet);
    list.push(sheet);
  }
  return getStyle(list, ` ${SSR_STYLE}`);
}

// 在子内容后执行，异步任务完成后才能输出元素
function buildElement({ op, element, hidden, conditionHidden, parentCtx }: ElementFrame, children: Piece[]) {
  const attrs = getElementAttrs(element);
  if (ssrContext.stateElements.has(element)) {
    attrs.set(SSR_STATE, JSON.stringify(element.internals.stateList.map((state) => ({ ...state }))));
  }
  setConditionAttrs(op, conditionHidden, attrs);
  const out: Piece[] = [`<${op.tag}${serializeAttrs(attrs)}>`];
  const { shadowRoot } = element;
  if (hidden) {
    if (shadowRoot) out.push(`<template${getShadowRootAttrs(shadowRoot)}></template>`);
    out.push(...children, op.close?.text ?? '');
    return out;
  }
  const template = renderedTemplates.get(shadowRoot || element);
  if (shadowRoot) {
    out.push(`<template${getShadowRootAttrs(shadowRoot)}>${getStyle(shadowRoot.adoptedStyleSheets)}`);
    const ctx: Context = { out, parent: shadowRoot, sheets: new Set(), hidden: false };
    if (template !== undefined) {
      out.push(ROOT_MARKER);
      renderValue(template, ctx);
    } else {
      // 没有根标记，客户端不会水合，模版返回 `undefined` 时保留这些内容
      out.push(shadowRoot.innerHTML);
    }
    out.push('</template>', ...children);
  } else {
    out.push(getLightStyle(element, parentCtx), ...children);
    if (template !== undefined) {
      out.push(ROOT_MARKER);
      renderValue(template, { out, parent: element, sheets: parentCtx.sheets, hidden: false });
    }
  }
  out.push(op.close?.text ?? '');
  element.disconnectedCallback();
  return out;
}

type Frame = { op: OpenOp; parentCtx: Context; finish: (children: Piece[]) => void };

function renderTemplate(result: TemplateResult, rootCtx: Context) {
  const { values } = result;
  const frames: Frame[] = [];
  let ctx = rootCtx;
  for (const op of compile(result)) {
    switch (op.type) {
      case 'static':
        ctx.out.push(op.text);
        break;
      case 'child':
        ctx.out.push(op.start);
        renderValue(values[op.index], ctx);
        if (op.end) ctx.out.push(END_MARKER);
        break;
      case 'raw': {
        let text = op.strings[0];
        for (let i = 1; i < op.strings.length; i++) {
          const value = String(values[op.index + i - 1] ?? '');
          text += escapableRawTextElements.test(op.tag) ? escapeText(value) : value.replaceAll('</', '<\\/');
          text += op.strings[i];
        }
        ctx.out.push(text);
        break;
      }
      case 'open': {
        const Element = op.custom ? customElements.get(op.tag) : undefined;
        const parentCtx = ctx;
        let frame: Frame;
        if (Element) {
          const elementFrame = createElement(Element, op, values, ctx);
          ctx = { ...ctx, out: [], parent: elementFrame.element, hidden: elementFrame.hidden };
          frame = {
            op,
            parentCtx,
            finish: (children) => {
              const { task } = elementFrame;
              if (!task) return parentCtx.out.push(...buildElement(elementFrame, children));
              const piece = task.then(() => buildElement(elementFrame, children));
              // 输出时才会等待，避免前面的内容未完成时出现未处理的错误
              piece.catch(() => {});
              parentCtx.out.push(piece);
            },
          };
        } else {
          const hidden = renderPlainElement(op, values, ctx);
          // 只有隐藏分支需要标记子元素不挂载
          if (!op.close || !hidden || ctx.hidden) break;
          ctx = { ...ctx, out: [], hidden: true };
          frame = { op, parentCtx, finish: (children) => parentCtx.out.push(...children, op.close!.text) };
        }
        if (op.close) {
          frames.push(frame);
        } else {
          ctx = parentCtx;
          frame.finish([]);
        }
        break;
      }
      case 'close': {
        const frame = frames.at(-1);
        if (frame?.op !== op.open) {
          ctx.out.push(op.text);
          break;
        }
        frames.pop();
        const children = ctx.out;
        ctx = frame.parentCtx;
        frame.finish(children);
        break;
      }
    }
  }
}

/*
 * 输出
 */

export interface RenderOptions {
  url?: string;
  /**
   * 渲染时使用的 store 值，渲染后的值会输出到页面中，客户端使用 `hydrateStores` 读取
   *
   * 只支持 JSON 值，只在当前请求中有效
   */
  stores?: Record<string, [Store<any>, object?]>;
}

type StoreEntries = [string, [Store<any>, object?]][];

function getStoresScript(stores: StoreEntries) {
  if (!stores.length) return '';
  const data = Object.fromEntries(stores.map(([key, [store]]) => [key, { ...store }]));
  // 避免内容中的 `</script>` 结束标签
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  return `<script type="application/json" id="${STORES_SCRIPT_ID}">${json}</script>`;
}

// 按顺序输出，遇到未完成的异步内容时先输出前面的内容
async function write(pieces: Piece[], push: (chunk: string) => void) {
  let buffer = '';
  const walk = async (list: Piece[]) => {
    for (const piece of list) {
      if (typeof piece === 'string') {
        buffer += piece;
      } else {
        if (buffer) push(buffer);
        buffer = '';
        await walk(await piece);
      }
    }
  };
  await walk(pieces);
  if (buffer) push(buffer);
}

async function renderPieces(result: unknown, { url, stores = {} }: RenderOptions, push: (chunk: string) => void) {
  setLocation(url || 'http://localhost/');
  const { pathname, search, hash } = location;
  history.replace({ path: pathname, query: search, hash });

  // store 在每个请求中有独立的值
  const entries: StoreEntries = Object.entries(stores);
  entries.forEach(([, [store, value]]) => value && Object.assign(store, value));
  const ctx: Context = { out: [ROOT_MARKER], parent: document, sheets: new Set(), hidden: false };
  renderValue(result, ctx);
  await write(ctx.out, push);
  push(getStoresScript(entries));
}

/**
 * 渲染成 HTML 片段，异步内容（路由、`@server`）完成前先输出前面的内容
 *
 * 每次渲染在独立的请求作用域中执行，在 `runInRequest` 中调用时使用当前的请求作用域，
 * 渲染不受读取速度影响，读取慢时内容会缓存起来
 */
export async function* render(result: unknown, options: RenderOptions = {}): AsyncGenerator<string> {
  const chunks: string[] = [];
  let notify: (() => void) | undefined;
  let done = false;
  const push = (chunk: string) => {
    if (chunk) chunks.push(chunk);
    notify?.();
  };
  const task = runInRequest(() => renderPieces(result, options, push)).finally(() => {
    done = true;
    notify?.();
  });
  // 提前结束读取时（例如客户端断开）不再关心渲染结果
  task.catch(() => {});
  while (true) {
    if (chunks.length) {
      yield chunks.splice(0).join('');
    } else if (done) {
      return task;
    } else {
      await new Promise<void>((resolve) => (notify = resolve));
    }
  }
}

export async function renderToString(result: unknown, options?: RenderOptions) {
  let html = '';
  for await (const chunk of render(result, options)) html += chunk;
  return html;
}
