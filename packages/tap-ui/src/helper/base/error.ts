import { ignoredPromiseReasonSet } from '../../lib/utils';

type ErrorIgnoreRule = string | RegExp | ((message: string, error: unknown) => boolean);

export const errorHandler = {
  ignoreRules: ['ResizeObserver', 'Script error.'] as ErrorIgnoreRule[],
  show(message: string, error: unknown) {
    console.error(error || message);
  },
};

let unloading = false;
addEventListener('beforeunload', () => {
  unloading = true;
  // prevented
  setTimeout(() => (unloading = false), 1000);
});

function getErrorMessage(error: unknown): string {
  if (error instanceof ErrorEvent) {
    return error.message || getErrorMessage(error.error);
  }
  if (error instanceof DOMException || error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error ?? '');
}

function handleError(error: unknown) {
  if (unloading) return;
  if (error instanceof DOMException && error.name === 'AbortError') return;

  const message = getErrorMessage(error);
  const shouldIgnoreError = errorHandler.ignoreRules.some((rule) => {
    if (typeof rule === 'string') return message.startsWith(rule);
    if (rule instanceof RegExp) return rule.test(message);
    return rule(message, error);
  });
  if (shouldIgnoreError) return;

  errorHandler.show(message, error);
}

function handlePromiseRejection({ reason }: PromiseRejectionEvent) {
  if (ignoredPromiseReasonSet.has(reason)) {
    ignoredPromiseReasonSet.delete(reason);
    return;
  }
  if (!reason) return;

  const errors = reason.errors || reason;
  if (Array.isArray(errors)) {
    errors.forEach(handleError);
  } else {
    handleError(reason.reason || reason);
  }
}

addEventListener('error', handleError);
addEventListener('unhandledrejection', handlePromiseRejection);
