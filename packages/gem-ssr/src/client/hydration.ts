import {
  ChildPart,
  ElementPart,
  type Part,
  type RootPart,
  TemplateInstance,
  TemplateResult,
} from '@mantou/gem/lib/lit-html';

export const LIT_PART_END = '/lit';
export const LIT_PART_START_RE = /\?lit\$(\d+)\$/;

export function isSSRRoot(node: Node | undefined | null): node is Comment {
  return node?.nodeType === Node.COMMENT_NODE && (node as Comment).data === '';
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

let walkerContainer: Node = document;
const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT, {
  acceptNode: (n) =>
    // 不是 ShadowDOM 的自定义元素中的子元素都屏蔽掉
    n.parentNode !== walkerContainer && isSSRRoot(n.parentNode?.firstChild)
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT,
});

interface IndexedNode {
  node: Node;
  // 如果是 child part，则可能有下面两个
  endNode?: ChildNode | null;
  childIndexMap?: Map<number, IndexedNode>;
}

type StackFrame = {
  index: number;
  indexedNode: IndexedNode;
  startNode: Node;
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
    if (isSSRRoot(node) || isSSREndEdge(node)) continue;

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

    if (isSSRStart(node)) {
      const indexedNode = { node, childIndexMap: new Map<number, IndexedNode>() };
      frame.indexedNode.childIndexMap!.set(frame.index++, indexedNode);
      stack.push({ indexedNode, index: 0, startNode: node });
      continue;
    }

    if (isSSREnd(node)) {
      stack.pop();
      frame.indexedNode.endNode = node;
      continue;
    }

    frame.indexedNode.childIndexMap!.set(frame.index++, { node });
  }
  return stack[0].indexedNode.childIndexMap!;
}

const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;

function buildPartsFromDOM(instance: TemplateInstance, values: unknown[], nodeIndexMap: Map<number, IndexedNode>) {
  const { parts } = instance._$template;
  if (parts.length === 0) return;

  const builtParts = new Array<Part | undefined>(parts.length).fill(undefined);
  for (let i = 0; i < parts.length; i++) {
    const templatePart = parts[i];
    const { node, endNode = null, childIndexMap } = nodeIndexMap.get(templatePart.index)!;

    if (templatePart.type === CHILD_PART) {
      const childPart = new ChildPart(node as ChildNode, endNode, instance, undefined);
      builtParts[i] = childPart;
      // 嵌套模板
      const value = values[i];
      if (value instanceof TemplateResult) {
        const nestedTemplate = (childPart as any)._$getTemplate(value);
        const nestedInstance = new TemplateInstance(nestedTemplate, childPart);
        buildPartsFromDOM(nestedInstance, value.values, childIndexMap!);
        childPart._$committedValue = nestedInstance;
      }
    } else if (templatePart.type === ATTRIBUTE_PART) {
      // 使用 templatePart.ctor 创建对应的 AttributePart 实例
      builtParts[i] = new (templatePart as any).ctor(
        node as Element,
        templatePart.name,
        templatePart.strings,
        instance,
        undefined,
      );
      (builtParts[i] as any)._$setValue(values[i]);
    } else if (templatePart.type === ELEMENT_PART) {
      // 创建一个简单的 ElementPart 对象
      builtParts[i] = new ElementPart(node as Element, instance, undefined);
    }
  }

  instance._$parts = builtParts;
}

export function hydrateContainer(result: TemplateResult, container: HTMLElement | DocumentFragment) {
  if ('_$litPart$' in container) return;

  const { firstChild } = container;
  const ele = firstChild?.nodeType === Node.COMMENT_NODE ? firstChild : firstChild?.nextSibling;
  if (!isSSRRoot(ele)) return;

  if (firstChild !== ele) firstChild!.remove();
  const rootStartNode = ele!;
  const rootPart = new ChildPart(rootStartNode, null, undefined, {});
  (container as any)._$litPart$ = rootPart;
  const template = (rootPart as any)._$getTemplate(result);
  const instance = new TemplateInstance(template, rootPart);
  buildPartsFromDOM(instance, result.values, buildNodeIndexMap(container));
  rootPart._$committedValue = instance;
  return rootPart as RootPart;
}
