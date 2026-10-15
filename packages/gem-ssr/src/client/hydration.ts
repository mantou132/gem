import {
  ChildPart,
  ConditionChain,
  ElementPart,
  type RootPart,
  TemplateInstance,
  TemplateResult,
} from '@mantou/gem/lib/lit-html';

import { LIT_PART_END, LIT_PART_START_RE, SSR_HIDDEN, SSR_STYLE, V_ELSE_IF, V_IF } from '../constants';
import { getTemplateDigest } from '../hash';

// 根标记和列表项的首尾标记，开始标记后面可能有模板的摘要（`#digest`）
export function isSSRRoot(node: Node | undefined | null): node is Comment {
  if (node?.nodeType !== Node.COMMENT_NODE) return false;
  const { data } = node as Comment;
  return data === '' || data[0] === '#';
}

export function isSSRStart(node: Node | undefined | null): node is Comment {
  return node?.nodeType === Node.COMMENT_NODE && LIT_PART_START_RE.test((node as Comment).data);
}

export function isSSREnd(node: Node | undefined | null): node is Comment {
  return node?.nodeType === Node.COMMENT_NODE && (node as Comment).data === LIT_PART_END;
}

export function isSSREndEdge(node: Node | undefined | null): node is Comment {
  return node?.nodeType === Node.COMMENT_NODE && (node as Comment).data === '?';
}

// 跳过元素前面插入的样式
function getSSRRoot(container: Node | null) {
  let node = container?.firstChild;
  while (node?.nodeName === 'STYLE') node = node.nextSibling;
  return isSSRRoot(node) ? node : undefined;
}

let walkerContainer: Node = document;
const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT, {
  acceptNode: (n) =>
    // 不是 ShadowDOM 的自定义元素中的子元素都屏蔽掉
    (n.parentNode !== walkerContainer && getSSRRoot(n.parentNode)) || (n as Element).hasAttribute?.(SSR_STYLE)
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT,
});

interface IndexedNode {
  node: Node;
  // 如果是 child part 或者列表项，则可能有下面这些
  endNode?: ChildNode | null;
  childIndexMap?: Map<number, IndexedNode>;
  items?: IndexedNode[];
}

type StackFrame = {
  index: number;
  indexedNode: IndexedNode;
  startNode: Node;
  isItem?: boolean;
};

function buildNodeIndexMap(container: Node) {
  walker.currentNode = container;
  walkerContainer = container;
  const rootIndexNode = { childIndexMap: new Map<number, IndexedNode>(), node: container };
  const stack: StackFrame[] = [{ index: 0, indexedNode: rootIndexNode, startNode: container.firstChild! }];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    // 超出容器
    if (node === container.nextSibling) break;
    // 忽略边缘注释
    if (isSSREndEdge(node)) continue;

    let frame = stack.at(-1)!;

    // 超出范围时应该闭合，并弹出栈
    while (
      stack.length >= 2 &&
      frame.indexedNode.endNode === undefined &&
      !frame.startNode.parentNode!.contains(node)
    ) {
      frame.indexedNode.endNode = null;
      stack.pop();
      frame = stack.at(-1)!;
    }

    // 根标记或者列表项的首尾标记
    if (isSSRRoot(node)) {
      if (stack.length < 2 || node.parentNode !== frame.startNode.parentNode) continue;
      if (frame.isItem) {
        frame.indexedNode.endNode = node as ChildNode;
        stack.pop();
      } else {
        const indexedNode = { node, childIndexMap: new Map<number, IndexedNode>() };
        (frame.indexedNode.items ||= []).push(indexedNode);
        stack.push({ indexedNode, index: 0, startNode: node, isItem: true });
      }
      continue;
    }

    if (isSSRStart(node)) {
      const indexedNode = { node, childIndexMap: new Map<number, IndexedNode>() };
      frame.indexedNode.childIndexMap!.set(frame.index++, indexedNode);
      stack.push({ indexedNode, index: 0, startNode: node });
      continue;
    }

    if (isSSREnd(node)) {
      stack.pop();
      frame.indexedNode.endNode = node as ChildNode;
      continue;
    }

    frame.indexedNode.childIndexMap!.set(frame.index++, { node });
  }
  return stack[0].indexedNode.childIndexMap!;
}

const ATTRIBUTE_PART = 1;
export const CHILD_PART = 2;
const ELEMENT_PART = 6;

// 根据 SSR 内容预先设置 `_$committedValue`，后面渲染时就会复用现有节点
function hydrateChildPart(part: ChildPart, value: unknown, indexedNode: IndexedNode) {
  if (value instanceof TemplateResult) {
    // 服务端和客户端渲染的模板不一致（例如依赖了浏览器环境，或者服务端输出了 `@fallback` 的内容），
    // 移除服务端的内容，由客户端渲染
    if (!(part.startNode as Comment).data.endsWith(`#${getTemplateDigest(value)}`)) {
      console.warn('gem-ssr: hydration template mismatch', part.parentNode);
      (part as any)._$clear();
      return;
    }
    const template = (part as any)._$getTemplate(value);
    part._$committedValue = buildInstance(template, part, value.values, indexedNode.childIndexMap!);
  } else if (Array.isArray(value)) {
    part._$committedValue = (indexedNode.items || []).map((item, index) => {
      const itemPart = new ChildPart(item.node as ChildNode, item.endNode!, part, part.options);
      hydrateChildPart(itemPart, value[index], item);
      return itemPart;
    });
  } else {
    // 记录 SSR 输出的文本，值不一致时会被更新
    const text = part.startNode!.nextSibling;
    if (text instanceof Text) part._$committedValue = text.data;
  }
}

function buildInstance(template: any, parent: ChildPart, values: unknown[], nodeIndexMap: Map<number, IndexedNode>) {
  const instance = new TemplateInstance(template, parent);
  const { options } = parent;
  const ifMap = new Map<Element, number>();
  const elseIfMap = new Map<Element, number>();
  // 和 `TemplateInstance._update` 一样，多值 attribute 会占用多个 value
  let valueIndex = 0;
  instance._$parts = template.parts.map((templatePart: any, partIndex: number) => {
    const indexedNode = nodeIndexMap.get(templatePart.index)!;
    const { node, endNode = null } = indexedNode;
    const index = valueIndex;
    valueIndex += templatePart.strings ? templatePart.strings.length - 1 : 1;
    if (templatePart.type === CHILD_PART) {
      const part = new ChildPart(node as ChildNode, endNode, instance, options);
      hydrateChildPart(part, values[index], indexedNode);
      return part;
    }
    if (templatePart.type === ATTRIBUTE_PART) {
      if (templatePart.name === V_IF) ifMap.set(node as Element, partIndex);
      if (templatePart.name === V_ELSE_IF) elseIfMap.set(node as Element, partIndex);
      return new templatePart.ctor(node as Element, templatePart.name, templatePart.strings, instance, options);
    }
    if (templatePart.type === ELEMENT_PART) {
      return new ElementPart(node as Element, instance, options);
    }
  });

  // 和 `TemplateInstance._clone` 一样构建条件链
  ifMap.forEach((idx, element) => {
    const chain = new ConditionChain(element, idx);
    instance._$conditions.push(chain);
    let ele: Element | null = element;
    while ((ele = ele.nextElementSibling)) {
      const pos = elseIfMap.get(ele);
      if (pos === undefined) break;
      chain.push(ele, pos);
    }
    for (const { ele } of chain.list) {
      const style = ele.getAttribute(SSR_HIDDEN);
      if (style === null) continue;
      ele.removeAttribute(SSR_HIDDEN);
      style ? ele.setAttribute('style', style) : ele.removeAttribute('style');
    }
  });
  return instance;
}

export function hydrateContainer(result: TemplateResult, container: HTMLElement | DocumentFragment) {
  if ('_$litPart$' in container) return;

  const rootStartNode = getSSRRoot(container);
  if (!rootStartNode) return;

  // SSR 输出的样式由客户端重新添加
  while (container.firstChild !== rootStartNode) container.firstChild!.remove();
  const rootPart = new ChildPart(rootStartNode, null, undefined, {});
  (container as any)._$litPart$ = rootPart;
  hydrateChildPart(rootPart, result, { node: container, childIndexMap: buildNodeIndexMap(container) });
  // 绑定事件、设置 property、移除隐藏的分支
  rootPart._$setValue(result);
  return rootPart as RootPart;
}
