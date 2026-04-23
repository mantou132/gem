import './lib/shim';

import { history, render as renderDom, type TemplateResult } from '@mantou/gem';
import { GemLightRouteElement } from '@mantou/gem/elements/route';
import type { ChildPart } from '@mantou/gem/lib/lit-html';

import { LIT_PART_END } from './client/hydration';
import { MockPromise, NativePromise } from './lib/promise';
import { dom } from './lib/shim';

const endTag = `<!--${LIT_PART_END}-->`;

function getStyle(sheets: CSSStyleSheet[] = []) {
  return sheets.map((sheet) => `<style>${sheet._text}</style>`).join('');
}

function collectEndNodes(node: Node, endNodeSet: Set<Node>) {
  const childPart: ChildPart = (node as any)._$litPart$;
  if (childPart) {
    const parts: ChildPart[] = (childPart._$committedValue as any)?._$parts || [];
    parts.forEach((part) => part.endNode && endNodeSet.add(part.endNode));
  }
}

// https://github.com/EasyWebApp/declarative-shadow-dom-polyfill/blob/main/source/index.ts#L93
const xmlSerializer = new XMLSerializer();
async function* generateHTML(root: Node, options: GetHTMLOptions = {}): AsyncGenerator<string> {
  const { serializableShadowRoots, shadowRoots = [] } = options;
  if (!serializableShadowRoots && !shadowRoots[0]) {
    yield (root as HTMLElement).innerHTML;
    return;
  }

  const endNodeSet = new Set<Node>();
  collectEndNodes(root, endNodeSet);

  const shadowRootsSet = new Set(shadowRoots);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, {
    acceptNode: (n) => (n === root || n instanceof SVGElement ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT),
  });
  let currentNode: Node | null = null;
  const stack: Element[] = [];
  while ((currentNode = walker.nextNode())) {
    while (stack.length > 0 && !stack.at(-1)!.contains(currentNode)) {
      const lastElement = stack.pop()!;
      yield `</${lastElement.tagName.toLowerCase()}>`;
    }
    if (endNodeSet.has(currentNode)) yield endTag;
    if (currentNode instanceof CDATASection) yield `<![CDATA[${currentNode.nodeValue}]]>`;
    else if (currentNode instanceof Text) yield currentNode.nodeValue || '';
    else if (currentNode instanceof Comment) yield `<!--${currentNode.nodeValue}-->`;
    else if (currentNode instanceof SVGElement) yield xmlSerializer.serializeToString(currentNode);
    else if (currentNode instanceof Element) {
      collectEndNodes(currentNode, endNodeSet);
      const tagName = currentNode.tagName.toLowerCase();
      const attributes = [...currentNode.attributes].map(({ name, value }) => `${name}="${value}"`);
      const shadowRoot = currentNode.shadowRoot;
      yield `<${[tagName, ...attributes].join(' ')}>`;
      if (currentNode instanceof GemLightRouteElement) {
        await currentNode.update();
      }
      if (shadowRoot && (shadowRootsSet.has(shadowRoot) || serializableShadowRoots)) {
        const shadowAttrs = [`shadowrootmode="${shadowRoot.mode}"`];
        if (shadowRoot.delegatesFocus) shadowAttrs.push('shadowrootdelegatesfocus');
        if (shadowRoot.serializable) shadowAttrs.push('shadowrootserializable');
        if (shadowRoot.clonable) shadowAttrs.push('shadowrootclonable');
        if (shadowRoot.slotAssignment === 'manual') shadowAttrs.push('shadowrootslotassignment="manual"');
        yield `<template ${shadowAttrs.join(' ')}>`;
        yield getStyle(shadowRoot.adoptedStyleSheets);
        yield* generateHTML(shadowRoot, options);
        yield `</template>`;
      }
      if (currentNode.childNodes[0]) {
        stack.push(currentNode);
      } else {
        yield `</${tagName}>`;
      }
    }
  }
  while (stack.length > 0) {
    const lastElement = stack.pop()!;
    yield `</${lastElement.tagName.toLowerCase()}>`;
  }
}

function tempReplacer() {
  const originVar = { Promise, queueMicrotask, setTimeout, setInterval };

  Object.assign(globalThis, {
    Promise: MockPromise,
    queueMicrotask: () => {},
    setTimeout: () => {},
    setInterval: () => {},
  });

  return () => {
    Object.assign(globalThis, originVar);
  };
}

export interface RenderOptions {
  url?: string;
}

export async function* render(result: TemplateResult, ctx: RenderOptions = {}) {
  dom.reconfigure({ url: ctx.url || 'https://example.org/' });
  const { pathname, search, hash } = location;
  history.replace({ path: pathname, query: search, hash });
  const restore = tempReplacer();
  try {
    renderDom(result, document.body);
    await NativePromise.resolve();
    yield getStyle(document.adoptedStyleSheets);
    yield* generateHTML(document.body, { serializableShadowRoots: true });
  } finally {
    restore();
  }
}

export async function renderToString(result: TemplateResult, ctx?: RenderOptions) {
  let text = '';
  for await (const chunk of render(result, ctx)) {
    text += chunk;
  }
  return text;
}
