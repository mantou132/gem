declare module '@mantou/gem' {
  // disable import the entire module
}

/** https://developer.mozilla.org/en-US/docs/Web/API/CloseWatcher */
interface CloseWatcher extends EventTarget {
  requestClose(): void;
  close(): void;
  destroy(): void;
}

declare var CloseWatcher: {
  prototype: CloseWatcher;
  new (options?: { signal?: AbortSignal }): CloseWatcher;
};
