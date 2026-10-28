import type { PanelStore } from '../store';

export function getDomStat(data: PanelStore): PanelStore {
  const { __GEM_DEVTOOLS__STORE__, __GEM_DEVTOOLS__HOOK__ } = window;
  if (!__GEM_DEVTOOLS__STORE__ || !__GEM_DEVTOOLS__HOOK__) return data;
  const { customElementMap, currentElementsMap } = __GEM_DEVTOOLS__STORE__;
  const { GemElement, ssr } = __GEM_DEVTOOLS__HOOK__;

  const elements: string[] = [];
  const customElements: string[] = [];
  const gemElements: string[] = [];
  const usedDefinedCustomElements = new Set<string>();
  const usedDefinedGemElements = new Set<string>();
  const mismatchElements: string[] = [];
  const hydratedElements: string[] = [];
  const serverElements: string[] = [];
  const lazyElements: string[] = [];

  currentElementsMap.clear();
  let n = 0;

  window.__GEM_DEVTOOLS__PRELOAD__.traverseDom((element) => {
    const id = String(++n);
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
    if (ssr) {
      const mismatches = ssr.hydrated.get(element.shadowRoot!) || ssr.hydrated.get(element);
      if (mismatches) hydratedElements.push(tagAndId);
      if (mismatches?.length) mismatchElements.push(tagAndId);
      if (element instanceof ssr.GemServerElement) serverElements.push(tagAndId);
      // 还没有加载代码的延时视图元素
      if (ssr.lazyElements.has(tag) && !window.customElements.get(tag)) lazyElements.push(tagAndId);
    }
  });

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
    ssr: !!ssr,
    mismatchElements,
    hydratedElements,
    serverElements,
    lazyElements,
  };
}
