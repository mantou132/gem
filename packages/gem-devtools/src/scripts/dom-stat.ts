import type { PanelStore } from '../store';

export function getDomStat(data: PanelStore): PanelStore {
  const { __GEM_DEVTOOLS__STORE__, __GEM_DEVTOOLS__HOOK__ } = window;
  if (!__GEM_DEVTOOLS__STORE__ || !__GEM_DEVTOOLS__HOOK__) return data;
  const { customElementMap, currentElementsMap } = __GEM_DEVTOOLS__STORE__;
  const { GemElement } = __GEM_DEVTOOLS__HOOK__;

  const elements = new Array<string>();
  const customElements = new Array<string>();
  const gemElements = new Array<string>();
  const usedDefinedCustomElements = new Set<string>();
  const usedDefinedGemElements = new Set<string>();

  currentElementsMap.clear();
  let n = 0;
  const temp: Element[] = [document.documentElement];
  while (!!temp.length) {
    const id = String(++n);
    const element = temp.pop()!;
    const tag = element.tagName.toLowerCase();
    const tagAndId = [tag, id].join();

    currentElementsMap.set(id, element);

    // devtools none use
    // elements.push(tagAndId);
    elements.push(['', id].join());
    if (tag.includes('-') && Object.getPrototypeOf(element) !== HTMLElement.prototype) {
      customElements.push(tagAndId);
      usedDefinedCustomElements.add(tag);
    }
    if (GemElement && element instanceof GemElement) {
      gemElements.push(tagAndId);
      usedDefinedGemElements.add(tag);
    }

    if (element.shadowRoot?.firstElementChild) temp.push(element.shadowRoot.firstElementChild);
    if (element.firstElementChild) temp.push(element.firstElementChild);
    if (element.nextElementSibling) temp.push(element.nextElementSibling);
  }

  return {
    ...data,
    elements,
    customElements,
    gemElements,
    definedCustomElements: [...customElementMap.keys()],
    definedGemElements: [...customElementMap.entries()]
      .filter(([_, cls]) => GemElement && cls.prototype instanceof GemElement)
      .map(([tag]) => tag),
    usedDefinedCustomElements: [...usedDefinedCustomElements],
    usedDefinedGemElements: [...usedDefinedGemElements],
  };
}
