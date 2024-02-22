import { Toast } from '../elements/toast';
import { ignoredPromiseReasonSet } from '../lib/utils';

let unloading = false;
addEventListener('beforeunload', () => {
  unloading = true;
  // prevented
  setTimeout(() => (unloading = false), 1000);
});

function printError(err: Error | ErrorEvent | DOMException) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return;
  }
  const ignoreError = [
    // chrome
    'ResizeObserver',
    'Script error.',
  ];
  if (unloading || ignoreError.some((msg) => err.message?.startsWith(msg))) return;
  Toast.open('error', err.message || String(err));
}

function handleRejection({ reason }: PromiseRejectionEvent) {
  if (ignoredPromiseReasonSet.has(reason)) {
    ignoredPromiseReasonSet.delete(reason);
    return;
  }
  if (reason) {
    const errors = reason.errors || reason;
    if (Array.isArray(errors)) {
      errors.forEach((err) => printError(err));
    } else {
      printError(reason.reason || reason);
    }
  }
}

addEventListener('error', printError);
addEventListener('unhandledrejection', handleRejection);
