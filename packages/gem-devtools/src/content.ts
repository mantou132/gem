type DevToolsHookStore = {
  customElementMap: Map<string, CustomElementConstructor>;
  currentElementsMap: Map<string, Element>;
};
declare global {
  interface Window {
    __GEM_DEVTOOLS__STORE__?: DevToolsHookStore;
  }
}

function initDevToolsHook() {
  // at document_start
  window.__GEM_DEVTOOLS__HOOK__ = {};
  window.__GEM_DEVTOOLS__STORE__ = {
    customElementMap: new Map(),
    currentElementsMap: new Map(),
  };

  const nativeDefineElement = window.customElements.define.bind(window.customElements);
  window.customElements.define = (...rest: Parameters<typeof customElements.define>) => {
    window.__GEM_DEVTOOLS__STORE__!.customElementMap.set(rest[0], rest[1]);
    nativeDefineElement(...rest);
  };
}

// only MV2
if (navigator.userAgent.includes('Firefox')) {
  const script = document.createElement('script');
  script.textContent = `(${initDevToolsHook.toString()})()`;
  document.documentElement.append(script);
  script.remove();
} else {
  initDevToolsHook();
}

export {};
