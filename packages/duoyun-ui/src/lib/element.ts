import type { Metadata } from '@mantou/gem/lib/element';
import { GemElement } from '@mantou/gem/lib/element';

export function getBoundingClientRect(eleList: Element[]) {
  const rects = eleList.map((e) => e.getBoundingClientRect());
  return {
    top: Math.min(...rects.map((e) => e.top)),
    left: Math.min(...rects.map((e) => e.left)),
    right: Math.max(...rects.map((e) => e.right)),
    bottom: Math.max(...rects.map((e) => e.bottom)),
  };
}

export function toggleActiveState(ele: Element | undefined | null, active: boolean) {
  if (!ele) return;
  if (ele instanceof GemElement) {
    if ((Reflect.get(ele.constructor, Symbol.metadata) as Metadata).definedCSSStates?.includes('active')) {
      (ele as any).active = active;
    }
    if (['button', 'combobox'].includes(ele.role || ele.internals.role || '')) {
      ele.internals.ariaExpanded = String(active);
    }
  }
  const closestEle = closestElement(ele, '[data-state-active]');
  if (closestEle instanceof HTMLElement) {
    closestEle.dataset.stateActive = active ? '?1' : '';
  }
}

/**Y axis */
export function findScrollContainer(startElement?: HTMLElement | null) {
  let element = startElement;
  while (element) {
    const { overflowY } = getComputedStyle(element);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return element;
    }
    element = element.parentElement || ((element.getRootNode() as ShadowRoot)?.host as HTMLElement);
  }
}

export function findRanges(root: Node, text: string) {
  const reg = new RegExp([...text].map((c) => `\\u{${c.codePointAt(0)!.toString(16)}}`).join(''), 'gui');
  const ranges: Range[] = [];
  const nodes: Node[] = [root];
  while (nodes.length) {
    const node = nodes.pop()!;
    switch (node.nodeType) {
      case Node.TEXT_NODE: {
        const matched = node.nodeValue?.matchAll(reg);
        if (matched) {
          for (const arr of matched) {
            if (arr.index !== undefined) {
              const range = new Range();
              range.setStart(node, arr.index);
              range.setEnd(node, arr.index + text.length);
              ranges.push(range);
            }
          }
        }
        break;
      }
      case Node.ELEMENT_NODE:
        if ((node as Element).shadowRoot) nodes.push((node as Element).shadowRoot as Node);
        break;
    }
    if (node.childNodes[0]) nodes.push(node.childNodes[0]);
    if (node.nextSibling) nodes.push(node.nextSibling);
  }
  return ranges;
}

export function findActiveElement() {
  let element = document.activeElement;
  while (element) {
    if (!element.shadowRoot?.activeElement) break;
    element = element.shadowRoot.activeElement;
  }
  return element;
}

export function isInputElement(originElement: HTMLElement) {
  if (
    originElement.isContentEditable ||
    originElement instanceof HTMLInputElement ||
    originElement instanceof HTMLTextAreaElement
  ) {
    return true;
  }
}

export function closestElement<K extends keyof HTMLElementTagNameMap>(
  ele: Element,
  tag: K,
): HTMLElementTagNameMap[K] | null;
export function closestElement<K extends abstract new (...args: any) => any>(
  ele: Element,
  con: K,
): InstanceType<K> | null;
export function closestElement<K extends Element>(ele: Element, tag: string): K | null;
export function closestElement<K extends abstract new (...args: any) => any>(ele: Element, selector: K | string) {
  let node: Element | null = ele;
  if (typeof selector === 'function') {
    while (node) {
      if (node instanceof selector) return node;
      node = node.parentElement || (node.getRootNode() as ShadowRoot).host;
    }
  } else {
    while (node) {
      const e = node.closest(selector);
      if (e) return e;
      node = (node.getRootNode() as ShadowRoot).host;
    }
  }
  return null;
}

export function containsElement(ele: Element, other: Element) {
  let node: Element | null = other;
  while (node) {
    if (ele.contains(node)) return true;
    node = (node.getRootNode() as ShadowRoot).host;
  }
  return false;
}

/**In addition to the parameter element, set the `inert` attribute for all element */
export function setBodyInert(modal: HTMLElement) {
  const map = new Map<HTMLElement, boolean>();
  [...document.body.children].forEach((e) => {
    if (e instanceof HTMLElement) {
      map.set(e, e.inert);
      e.inert = true;
    }
  });
  modal.inert = false;
  return () => {
    map.forEach((inert, ele) => {
      ele.inert = inert;
    });
    modal.inert = true;
  };
}
