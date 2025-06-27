import './lib/shim';

import { render as renderDom, type TemplateResult } from '@mantou/gem';

import { MockPromise } from './lib/promise';

function getStyle(sheets: CSSStyleSheet[] = []) {
  return sheets.map((sheet) => `<style>${sheet._text}</style>`).join('');
}

// https://github.com/EasyWebApp/declarative-shadow-dom-polyfill/blob/main/source/index.ts#L93
const xmlSerializer = new XMLSerializer();
function* generateHTML(root: Node, options: GetHTMLOptions = {}): Generator<string> {
  const { serializableShadowRoots, shadowRoots = [] } = options;
  if (!serializableShadowRoots && !shadowRoots[0]) {
    yield (root as HTMLElement).innerHTML;
    return;
  }

  const shadowRootsSet = new Set(shadowRoots);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, {
    acceptNode: (n) => (n === root || n instanceof SVGElement ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT),
  });
  let currentNode: Node | null = null;
  while ((currentNode = walker.nextNode())) {
    if (currentNode instanceof CDATASection) yield `<![CDATA[${currentNode.nodeValue}]]>`;
    else if (currentNode instanceof Text) yield currentNode.nodeValue || '';
    else if (currentNode instanceof Comment) yield `<!--${currentNode.nodeValue}-->`;
    else if (currentNode instanceof SVGElement) yield xmlSerializer.serializeToString(currentNode);
    else if (currentNode instanceof Element) {
      const tagName = currentNode.tagName.toLowerCase();
      const attributes = [...currentNode.attributes].map(({ name, value }) => `${name}="${value}"`);
      const shadowRoot = currentNode.shadowRoot;
      yield `<${[tagName, ...attributes].join(' ')}>`;
      if (shadowRoot && (shadowRootsSet.has(shadowRoot) || serializableShadowRoots)) {
        yield `<template shadowrootmode="${shadowRoot.mode}">`;
        yield getStyle(shadowRoot.adoptedStyleSheets);
        yield* generateHTML(shadowRoot, options);
        yield `</template>`;
      }
      if (!currentNode.childNodes[0]) yield `</${tagName}>`;
    }
    const { nextSibling, parentElement } = currentNode;
    if (!nextSibling && parentElement && parentElement !== root) yield `</${parentElement.tagName.toLowerCase()}>`;
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

export async function* render(result: TemplateResult) {
  const next = Promise.resolve();
  const restore = tempReplacer();
  try {
    renderDom(result, document.body);
    await next;
    yield getStyle(document.adoptedStyleSheets);
    yield* generateHTML(document.body, { serializableShadowRoots: true });
  } finally {
    restore();
  }
}

export async function renderToString(result: TemplateResult) {
  let t = '';
  for await (const chunk of render(result)) {
    t += chunk;
  }
  return t;
}
