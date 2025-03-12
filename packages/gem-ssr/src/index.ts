import './lib/shim';

import { render, type TemplateResult } from '@mantou/gem/lib/lit-html';
import { raw } from '@mantou/gem/lib/utils';

export function renderToString(result: TemplateResult) {
  const div = document.createElement('div');
  render(result, div);
  return raw(result.strings, ...result.values);
}
