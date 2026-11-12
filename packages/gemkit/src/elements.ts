// 客户端获取页面中纯服务端元素的 HTML

import { history } from '@mantou/gem';

import {
  checkVersion,
  getFileUrl,
  getHistoryEntry,
  Outdated,
  prefetchRequest,
  reload,
  takePrefetched,
  updateHistoryEntry,
} from './cache';
import { ELEMENT_PATH, ELEMENTS_FILE, REDIRECT_HEADER } from './constants';
import { Redirect } from './error';
import { navigate } from './navigation';
import type { ElementsFile, ElementsResult, ServerElementParams } from './types';

// 页面中纯服务端元素的 HTML，同一个页面的元素共用一个请求
let elementsRequest: { url: string; promise: Promise<Record<string, string>> } | undefined;

// 同一轮渲染中需要服务端渲染的元素合并成一个请求
let renderBatch: { url: string; elements: ServerElementParams[]; promise: Promise<string[]> } | undefined;

function renderElement(url: string, element: ServerElementParams) {
  if (renderBatch?.url !== url) {
    const batch = { url, elements: [] as ServerElementParams[], promise: Promise.resolve([] as string[]) };
    // 等同一轮的元素都加入后再请求
    batch.promise = Promise.resolve().then(async () => {
      if (renderBatch === batch) renderBatch = undefined;
      const res = await fetch(ELEMENT_PATH, {
        method: 'POST',
        body: JSON.stringify({ url, elements: batch.elements }),
      });
      if (!res.ok) throw new Error(`gemkit: failed to render server elements of \`${url}\``);
      // `handle` 中的跳转，例如没有登录
      const redirectTo = res.headers.get(REDIRECT_HEADER);
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        throw new Redirect(302, redirectTo);
      }
      const { html, version }: ElementsResult = await res.json();
      checkVersion(version);
      return html!;
    });
    renderBatch = batch;
  }
  const index = renderBatch.elements.push(element) - 1;
  return renderBatch.promise.then((list) => list[index]);
}

async function fetchElements(url: string) {
  const res = await fetch(url);
  if (!res.ok) return {};
  const { elements, version }: ElementsFile = await res.json();
  checkVersion(version);
  return elements;
}

// 预渲染时才有页面中纯服务端元素的 HTML 文件，在构建时确定
const hasElementsFile = process.env.GEMKIT_PRERENDER !== 'false';

/** 预取页面中纯服务端元素的 HTML */
export function prefetchElements(path: string, search: string) {
  if (!hasElementsFile) return;
  const url = getFileUrl(path, search, ELEMENTS_FILE);
  prefetchRequest(url, () => fetchElements(url));
}

/** 获取当前页面中纯服务端元素的 HTML，导航时调用可以和页面模块、数据并行，没有预渲染时为空 */
export function loadPageElements() {
  if (!hasElementsFile) return Promise.resolve({} as Record<string, string>);
  const url = getFileUrl(history.getParams().path, location.search, ELEMENTS_FILE);
  if (elementsRequest?.url !== url) {
    const promise: Promise<Record<string, string>> = takePrefetched(url) || fetchElements(url);
    // 导航时总会请求，页面中没有纯服务端元素时不使用
    promise.catch(() => {});
    elementsRequest = { url, promise };
  }
  return elementsRequest.promise;
}

/**
 * 客户端创建纯服务端元素或者延时视图元素时获取 HTML，先从预渲染的 `__elements.json` 中获取，
 * 没有时（例如没有预渲染或者交互后才出现的元素）请求服务端渲染，静态托管时不可用
 */
export async function loadServerElement(
  key: string,
  tag: string,
  attrs: ServerElementParams['attrs'],
  props: ServerElementParams['props'],
) {
  const historyKey = history.currentKey;
  // 前进后退时使用离开时的 HTML
  const cached = getHistoryEntry(historyKey)?.elements[key];
  if (cached !== undefined) return cached;
  const pageUrl = history.basePath + history.getParams().path + location.search;
  let html: string;
  try {
    html = (await loadPageElements())[key] ?? (await renderElement(pageUrl, { tag, attrs, props }));
  } catch (err) {
    // 不能把新版本的 HTML 放到旧的页面中
    if (err instanceof Outdated) return reload();
    throw err;
  }
  updateHistoryEntry(historyKey, (entry) => {
    entry.elements[key] = html;
  });
  return html;
}
