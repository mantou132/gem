import { GemElement } from '@mantou/gem/lib/element';

export function getAssignedElements(ele: HTMLSlotElement): Element[] {
  const es = ele!.assignedElements();
  if (es[0] instanceof HTMLSlotElement) {
    return getAssignedElements(es[0]);
  }
  return es;
}

export function getBoundingClientRect(eles: Element[]) {
  const rects = eles.map((e) => e.getBoundingClientRect());
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
