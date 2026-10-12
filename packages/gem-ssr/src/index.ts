import './lib/shim';

import { history, render as renderDom, type TemplateResult } from '@mantou/gem';
import { GemLightRouteElement } from '@mantou/gem/elements/route';
import { type ChildPart, type ConditionChain, TemplateInstance } from '@mantou/gem/lib/lit-html';

import { CHILD_PART, LIT_PART_END, SSR_HIDDEN, V_ELSE } from './client/hydration';
import { dom } from './lib/shim';

const endTag = `<!--${LIT_PART_END}-->`;

// https://html.spec.whatwg.org/multipage/syntax.html#void-elements
const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const rawTextElements = new Set(['style', 'script']);

const escapeText = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeAttr = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

function getStyle(sheets: CSSStyleSheet[] = []) {
  return sheets.map((sheet) => `<style>${sheet._text}</style>`).join('');
}

// 没有结束标记的 ChildPart 在水合时会延伸到父节点末尾，所以要给所有有 endNode 的 part 加上结束标记
function collectEndNodes(value: unknown, endNodeSet: Set<Node>) {
  if (Array.isArray(value)) {
    // 列表项自带首尾标记
    value.forEach((item: ChildPart) => collectEndNodes(item._$committedValue, endNodeSet));
  } else if (value instanceof TemplateInstance) {
    for (const part of value._$parts) {
      if (part?.type !== CHILD_PART) continue;
      if (part.endNode) endNodeSet.add(part.endNode);
      collectEndNodes(part._$committedValue, endNodeSet);
    }
  }
}

function serializeAttrs(attrs: Record<string, string>) {
  return Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
    .join('');
}

function serializeShadowRootAttrs(shadowRoot: ShadowRoot) {
  return serializeAttrs({
    shadowrootmode: shadowRoot.mode,
    ...(shadowRoot.delegatesFocus && { shadowrootdelegatesfocus: '' }),
    ...(shadowRoot.serializable && { shadowrootserializable: '' }),
    ...(shadowRoot.clonable && { shadowrootclonable: '' }),
    ...(shadowRoot.slotAssignment === 'manual' && { shadowrootslotassignment: 'manual' }),
  });
}

// https://github.com/EasyWebApp/declarative-shadow-dom-polyfill/blob/main/source/index.ts#L93
const xmlSerializer = new XMLSerializer();

// 序列化过程不能修改 DOM
async function* generateChildren(parent: Node, endNodeSet: Set<Node>): AsyncGenerator<string> {
  collectEndNodes((parent as any)._$litPart$?._$committedValue, endNodeSet);
  for (const node of parent.childNodes) {
    if (endNodeSet.has(node)) yield endTag;
    if (node instanceof CDATASection) {
      yield `<![CDATA[${node.nodeValue}]]>`;
    } else if (node instanceof Text) {
      const text = node.nodeValue || '';
      yield rawTextElements.has(parent.nodeName.toLowerCase()) ? text : escapeText(text);
    } else if (node instanceof Comment) {
      const chain: ConditionChain | undefined = (node as any)._$chain;
      if (!chain) {
        yield `<!--${node.nodeValue}-->`;
        continue;
      }
      // 所有分支都要输出，水合时节点索引才能和模板一致
      for (const { ele, idx } of chain.list) {
        yield* generateElement(ele, endNodeSet, {
          ...(idx === undefined && { [V_ELSE]: '' }),
          ...(!ele.parentNode && { style: 'display:none', [SSR_HIDDEN]: ele.getAttribute('style') ?? '' }),
        });
      }
    } else if (node instanceof Element) {
      // 已经随条件链输出
      const chain: ConditionChain | undefined = (node.previousSibling as any)?._$chain;
      if (chain?.list.some(({ ele }) => ele === node)) continue;
      yield* generateElement(node, endNodeSet);
    }
  }
}

async function* generateElement(ele: Element, endNodeSet: Set<Node>, extraAttrs?: Record<string, string>) {
  if (ele instanceof SVGElement) {
    yield xmlSerializer.serializeToString(ele);
    return;
  }
  const tagName = ele.tagName.toLowerCase();
  const attrs = Object.fromEntries([...ele.attributes].map(({ name, value }) => [name, value]));
  yield `<${tagName}${serializeAttrs({ ...attrs, ...extraAttrs })}>`;
  if (voidElements.has(tagName)) return;
  if (ele instanceof GemLightRouteElement) await ele.update();
  const { shadowRoot } = ele;
  if (shadowRoot) {
    yield `<template${serializeShadowRootAttrs(shadowRoot)}>`;
    yield getStyle(shadowRoot.adoptedStyleSheets);
    yield* generateChildren(shadowRoot, endNodeSet);
    yield `</template>`;
  }
  yield* generateChildren(ele, endNodeSet);
  yield `</${tagName}>`;
}

export interface RenderOptions {
  url?: string;
}

async function renderChunks(result: TemplateResult, ctx: RenderOptions) {
  dom.reconfigure({ url: ctx.url || 'https://example.org/' });
  const { pathname, search, hash } = location;
  history.replace({ path: pathname, query: search, hash });
  // 每次请求都使用新的容器，避免复用上次请求的 DOM
  document.body = document.createElement('body');
  renderDom(result, document.body);
  await Promise.resolve();
  const style = getStyle(document.adoptedStyleSheets);
  return [style, ...(await Array.fromAsync(generateChildren(document.body, new Set())))];
}

// 所有请求共享一个 DOM 环境，所以渲染必须串行执行
// 在锁内生成完整内容，避免客户端读取过慢时一直占用
let queue: Promise<unknown> = Promise.resolve();

export async function* render(result: TemplateResult, ctx: RenderOptions = {}) {
  const task = queue.then(() => renderChunks(result, ctx));
  queue = task.catch(() => {});
  yield* await task;
}

export async function renderToString(result: TemplateResult, ctx?: RenderOptions) {
  let text = '';
  for await (const chunk of render(result, ctx)) {
    text += chunk;
  }
  return text;
}
