import { ChildPart, type RootPart, TemplateInstance, TemplateResult } from '@mantou/gem/lib/lit-html';

export const LIT_PART_END = '/lit';
export const LIT_PART_START_RE = /\?lit\$(\d+)\$/;
const CHILD_PART = 2;

export function isSSRRoot(node: Node | undefined | null): node is Comment {
  return node?.nodeType === Node.COMMENT_NODE && (node as Comment).data === '';
}

export function isSSRStart(node: Node | undefined | null): node is Comment {
  return node?.nodeType === Node.COMMENT_NODE && LIT_PART_START_RE.test((node as Comment).data);
}

export function isSSREnd(node: Node | undefined | null): node is Comment {
  return node?.nodeType === Node.COMMENT_NODE && (node as Comment).data === LIT_PART_END;
}

function buildPartsFromDOM(
  instance: TemplateInstance,
  container: Element | ShadowRoot | DocumentFragment,
  values: unknown[],
): void {
  const { parts } = instance._$template;
  if (parts.length === 0) return;

  const builtParts: Array<ChildPart | undefined> = new Array(parts.length).fill(undefined);
  const childPartIndices = parts.map((p, i) => (p.type === CHILD_PART ? i : -1)).filter((i) => i >= 0);

  // 单次遍历：收集所有 SSR start 注释，使用栈处理嵌套
  const stack: Array<{ startNode: Comment; partIndex: number }> = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT);
  let node: Comment | null;
  let markerIdx = 0;

  while ((node = walker.nextNode() as Comment | null)) {
    if (isSSRStart(node)) {
      const partIndex = childPartIndices[markerIdx++];
      if (partIndex === undefined) continue;
      stack.push({ startNode: node, partIndex });
    } else if (isSSREnd(node) && stack.length > 0) {
      const { startNode, partIndex } = stack.pop()!;
      const childPart = new ChildPart(startNode, node, instance, {});
      builtParts[partIndex] = childPart;

      const value = values[partIndex];
      if (value instanceof TemplateResult) {
        // 嵌套模板：递归水合
        const nestedResult = value as TemplateResult;
        const template = (childPart as any)._$getTemplate(nestedResult);
        const nestedInstance = new TemplateInstance(template, childPart);

        const fragment = document.createDocumentFragment();
        let cur = startNode.nextSibling;
        while (cur && cur !== node) {
          const next = cur.nextSibling;
          fragment.appendChild(cur);
          cur = next;
        }

        buildPartsFromDOM(nestedInstance, fragment, nestedResult.values);

        while (fragment.firstChild) {
          startNode.parentNode!.insertBefore(fragment.firstChild, node);
        }
        childPart._$committedValue = nestedInstance;
      } else {
        // 纯文本
        const contentNodes: ChildNode[] = [];
        let cur = startNode.nextSibling;
        while (cur && cur !== node) {
          if (!isSSREnd(cur)) contentNodes.push(cur);
          cur = cur.nextSibling;
        }
        if (contentNodes.length === 1 && contentNodes[0].nodeType === Node.TEXT_NODE) {
          childPart._$committedValue = (contentNodes[0] as Text).data;
        }
      }
    }
  }

  // 处理没有结束注释的 ChildPart（内容到父元素末尾）
  while (stack.length > 0) {
    const { startNode, partIndex } = stack.pop()!;
    const childPart = new ChildPart(startNode, null, instance, {});
    builtParts[partIndex] = childPart;

    const value = values[partIndex];
    if (value instanceof TemplateResult) {
      const nestedResult = value;
      const template = (childPart as any)._$getTemplate(nestedResult);
      const nestedInstance = new TemplateInstance(template, childPart);

      const fragment = document.createDocumentFragment();
      let cur = startNode.nextSibling;
      while (cur) {
        const next = cur.nextSibling;
        fragment.appendChild(cur);
        cur = next;
      }

      buildPartsFromDOM(nestedInstance, fragment, nestedResult.values);

      while (fragment.firstChild) {
        startNode.parentNode!.appendChild(fragment.firstChild);
      }
      childPart._$committedValue = nestedInstance;
    } else {
      const contentNodes: ChildNode[] = [];
      let cur = startNode.nextSibling;
      while (cur) {
        if (!isSSREnd(cur)) contentNodes.push(cur);
        cur = cur.nextSibling;
      }
      if (contentNodes.length === 1 && contentNodes[0].nodeType === Node.TEXT_NODE) {
        childPart._$committedValue = (contentNodes[0] as Text).data;
      }
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
  buildPartsFromDOM(instance, container, result.values);
  rootPart._$committedValue = instance;
  return rootPart as RootPart;
}
