// 用户交互时加载延时视图元素，加载后重放触发加载的事件
const INTERACTION_EVENTS = ['pointerdown', 'click', 'focusin', 'keydown', 'input'];

const lazyElements = new Map<string, () => Promise<unknown>>();
const loading = new Map<string, Promise<unknown>>();

function loadElement(tag: string) {
  if (!loading.has(tag)) loading.set(tag, lazyElements.get(tag)!());
  return loading.get(tag)!;
}

const isLazy = (node: unknown): node is Element =>
  node instanceof Element && lazyElements.has(node.localName) && !customElements.get(node.localName);

async function onInteraction(event: Event) {
  const path = event.composedPath();
  const host = path.find(isLazy);
  if (!host) return;
  // 加载后重新派发，避免其他监听器收到两次；
  // 合成的 `click` 也会触发默认行为（例如链接导航），其他事件的默认行为（例如输入）需要保留
  event.stopImmediatePropagation();
  if (event.type === 'click') event.preventDefault();
  await loadElement(host.localName);
  // 加载前元素没有监听器，重新派发给原来的目标
  path[0].dispatchEvent(new (event.constructor as typeof Event)(event.type, event));
}

// 客户端创建的元素（例如客户端导航）没有服务端渲染的内容，直接加载
function onMutation(records: MutationRecord[]) {
  for (const { addedNodes } of records) {
    for (const node of addedNodes) {
      if (!(node instanceof Element)) continue;
      for (const tag of lazyElements.keys()) {
        if (!customElements.get(tag) && (node.localName === tag || node.querySelector(tag))) loadElement(tag);
      }
    }
  }
}

// 注册了延时视图元素才观察
let observer: MutationObserver | undefined;

/** 观察容器中客户端创建的延时视图元素，例如新创建的 ShadowRoot 和水合的容器 */
export function observeLazyRoot(root: Node) {
  observer?.observe(root, { childList: true, subtree: true });
}

function init() {
  observer = new MutationObserver(onMutation);
  for (const type of INTERACTION_EVENTS) document.addEventListener(type, onInteraction, { capture: true });
  observeLazyRoot(document);
  const { attachShadow } = Element.prototype;
  Element.prototype.attachShadow = function (this: Element, init: ShadowRootInit) {
    const root = attachShadow.call(this, init);
    observeLazyRoot(root);
    return root;
  };
}

/**
 * 注册延时视图元素，客户端构建时 `@server({ lazy: true })` 标记的元素模块会被改写成调用这个方法
 *
 * 服务端渲染的元素在用户交互时加载，客户端创建的元素立即加载
 */
export function defineLazy(tag: string, load: () => Promise<unknown>) {
  lazyElements.set(tag, load);
  if (lazyElements.size === 1) init();
}
