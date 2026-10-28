import { SSR_SERVER } from '../constants';
import { SSR_STATE } from '../decorators';
import { fillServerContent, getServerElementParams, loadServerElement } from './server-element';

export interface LazyOptions {
  /**
   * 什么时候加载元素代码，在这之前用户交互时也会加载并重放触发加载的事件
   * - `interaction`：用户交互时
   * - `load`：页面加载完（`load` 事件后浏览器空闲时）
   * - `visible`：元素进入视口时
   * @default 'interaction'
   */
  on?: 'interaction' | 'load' | 'visible';
}

// 用户交互时加载延时视图元素，加载后重放触发加载的事件
const INTERACTION_EVENTS = ['pointerdown', 'click', 'focusin', 'keydown', 'input'];

export const lazyElements = new Map<string, { load: () => Promise<unknown>; on: NonNullable<LazyOptions['on']> }>();
export const loading = new Map<string, Promise<unknown>>();

function loadElement(tag: string) {
  if (!loading.has(tag)) loading.set(tag, lazyElements.get(tag)!.load());
  return loading.get(tag)!;
}

let pageLoaded: Promise<void> | undefined;

/** `load` 事件后浏览器空闲时，避免和页面的其他资源竞争 */
function whenPageLoaded() {
  pageLoaded ||= new Promise<void>((resolve) => {
    // https://bugs.webkit.org/show_bug.cgi?id=285049
    const idle = () => setTimeout(resolve);
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
  });
  return pageLoaded;
}

let intersectionObserver: IntersectionObserver | undefined;

function observeVisible(ele: Element) {
  intersectionObserver ||= new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      intersectionObserver!.unobserve(target);
      loadElement(target.localName);
    }
  });
  intersectionObserver.observe(ele);
}

/** 按 `on` 选项安排加载服务端渲染（或者已经填入服务端内容）的元素 */
function scheduleLoad(ele: Element) {
  const tag = ele.localName;
  if (customElements.get(tag)) return;
  const { on } = lazyElements.get(tag)!;
  if (on === 'load') whenPageLoaded().then(() => loadElement(tag));
  if (on === 'visible') observeVisible(ele);
}

/** 文档中服务端渲染的元素，包括开放的 ShadowRoot（例如声明式 Shadow DOM）中的元素 */
function queryDeep(root: ParentNode, tag: string, result: Element[] = []) {
  for (const ele of root.querySelectorAll('*')) {
    if (ele.localName === tag) result.push(ele);
    if (ele.shadowRoot) queryDeep(ele.shadowRoot, tag, result);
  }
  return result;
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

/**
 * 客户端创建的元素（例如客户端导航）没有服务端渲染的内容，和纯服务端元素一样从服务端获取，
 * 然后和服务端渲染的元素一样按 `on` 选项加载元素代码并水合
 */
async function fillElement(ele: Element) {
  await fillContent(ele);
  scheduleLoad(ele);
}

async function fillContent(ele: Element) {
  // 已经有服务端渲染的内容，例如获取的内容中嵌套的延时视图元素
  if (ele.hasAttribute(SSR_SERVER)) return;
  const source = await loadServerElement(getServerElementParams(ele));
  // 获取期间用户交互加载了元素代码，已经由客户端渲染
  if (!source || customElements.get(ele.localName)) return;
  // 状态在水合时恢复，标记在升级时移除，移动元素时不会重新获取
  for (const name of [SSR_STATE, SSR_SERVER]) {
    const value = source.getAttribute(name);
    if (value !== null) ele.setAttribute(name, value);
  }
  fillServerContent(ele, source);
}

function onMutation(records: MutationRecord[]) {
  // 合并成一个选择器，每个添加的节点只查找一次
  const selector = [...lazyElements.keys()].filter((tag) => !customElements.get(tag)).join();
  if (!selector) return;
  for (const { addedNodes } of records) {
    for (const node of addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches(selector)) fillElement(node);
      for (const ele of node.querySelectorAll(selector)) fillElement(ele);
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
 * 注册延时视图元素，客户端构建时 `@lazy()` 标记的元素模块会被改写成调用这个方法，`options` 是 `@lazy()` 的参数
 *
 * 按 `on` 选项加载元素代码，客户端创建的元素先从服务端获取 HTML
 */
export function defineLazy(tag: string, load: () => Promise<unknown>, { on = 'interaction' }: LazyOptions = {}) {
  lazyElements.set(tag, { load, on });
  if (lazyElements.size === 1) init();
  if (on === 'load') {
    whenPageLoaded().then(() => {
      if (queryDeep(document, tag).length) loadElement(tag);
    });
  }
  if (on === 'visible') queryDeep(document, tag).forEach(observeVisible);
}
