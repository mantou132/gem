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
  if (ele instanceof GemElement) {
    if ((ele.constructor as typeof GemElement).defineCSSStates?.includes('active')) {
      (ele as any).active = active;
    }
    // button/combobox
    ele.internals.ariaExpanded = String(active);
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
  while (!!nodes.length) {
    const node = nodes.pop()!;
    switch (node.nodeType) {
      case Node.TEXT_NODE:
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
      case Node.ELEMENT_NODE:
        if ((node as Element).shadowRoot) nodes.push((node as Element).shadowRoot as Node);
        break;
    }
    if (node.childNodes[0]) nodes.push(node.childNodes[0]);
    if (node.nextSibling) nodes.push(node.nextSibling);
  }
  return ranges;
}
