// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
import type { ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
import type { Root } from 'react-dom/client';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
import { createRoot } from 'react-dom/client';

import type { Store } from '../lib/store';
import { connect } from '../lib/store';

/**
 * `<gem-route>.routes.getContent`
 */
export function renderReactNode(ele: any, node: ReactNode) {
  ele.react?.unmount();
  ele.react = createRoot(ele);
  // async
  ele.react.render(node);

  const routeEle = ele instanceof HTMLElement ? ele : ele.host;
  if (!routeEle.reactCallback) {
    routeEle.effect(
      () => () => ele.react.unmount(),
      () => [],
    );
    routeEle.reactCallback = true;
  }
}

/**
 * Same as `@connectStore`
 */
export function connectStore<T extends object>(store: Store<T>) {
  const [_, update] = useState({});
  useEffect(() => connect(store, () => update({})), []);
}

/**
 * Warning: https://github.com/facebook/react/issues/25675
 */
export function useReactNode(node: ReactNode) {
  const ref = useRef<{ root: Root; container: HTMLElement }>();
  // Warning: Attempted to synchronously unmount a root while React was already rendering. React cannot finish unmounting the root until the current render has completed, which may lead to a race condition.
  useEffect(() => () => ref.current?.root.unmount(), []);
  if (ref.current) {
    ref.current.root.render(node);
    return ref.current.container;
  }
  const container = document.createElement('div');
  container.style.display = 'contents';
  const root = createRoot(container);
  ref.current = { root, container };
  // Warning: Render methods should be a pure function of props and state; triggering nested component updates from render is not allowed. If necessary, trigger nested updates in componentDidUpdate.
  root.render(node);
  return container;
}
