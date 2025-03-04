// 由于只复制函数体，所以不能使用装饰器、字段，直到浏览器原生支持
export const appendScanElement = function () {
  const { setEngine, css, createState, GemElement, render, html } = window.__GEM_DEVTOOLS__HOOK__!;

  if (customElements.get('devtools-scan')) {
    document.body.after(document.createElement('devtools-scan'));
    return;
  }

  const styles = css`
    :host {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    }
    .highlight {
      position: absolute;
      border: 1px solid #2680eb;
      background: #267feb10;

      &::before {
        content: attr(data-content);
        white-space: nowrap;
        position: absolute;
        left: 0;
        top: 0;
        background: #2680eb;
        color: #fff;
        padding: 1px 2px;
        font-size: 8px;
      }
    }
  `;

  const renderCountMap = new WeakMap<Element, number>();

  class ScanElement extends GemElement {
    declare state: ReturnType<
      typeof createState<{
        highlightElements: Map<Element, { ele: HTMLElement }>;
      }>
    >;
    constructor() {
      super();
      this.state = createState({ highlightElements: new Map() });
    }

    renderFn(...args: Parameters<typeof render>) {
      if (args[1] === this.shadowRoot) return render(...args);

      const { highlightElements } = this.state;
      const container = args[1] instanceof ShadowRoot ? args[1].host : (args[1] as Element);
      const count = (renderCountMap.get(container) || 0) + 1;

      renderCountMap.set(container, count);

      if (!highlightElements.has(container)) {
        const { x, y, width, height } = container.getBoundingClientRect();
        const ele = document.createElement('div');
        ele.classList.add('highlight');
        ele.style.left = x + 'px';
        ele.style.top = y + 'px';
        ele.style.width = width + 'px';
        ele.style.height = height + 'px';
        highlightElements.set(container, { ele });
      }

      const { ele } = highlightElements.get(container)!;
      queueMicrotask(async () => {
        await ele.animate({ opacity: [1, 0] }, { duration: 1200 }).finished;
        if (ele.getAnimations().length) return;
        highlightElements.delete(container);
        this.state();
      });
      ele.dataset.content = `x${count}`;
      this.state();
      return render(...args);
    }

    mounted() {
      setEngine(html, this.renderFn.bind(this));
      return () => setEngine(html, render);
    }

    render() {
      const { highlightElements } = this.state;
      return html`${[...highlightElements.values()].map(({ ele }) => ele)}`;
    }
  }

  ScanElement[Symbol.metadata] = { adoptedStyleSheets: [styles], mode: 'open' };
  customElements.define('devtools-scan', ScanElement);
  document.body.after(document.createElement('devtools-scan'));
};

export const checkScanElement = function () {
  return !!document.querySelector('devtools-scan');
};

export const checkGemElement = function () {
  return !!window.__GEM_DEVTOOLS__HOOK__?.GemElement;
};
