import { expect, should, assert } from 'chai';

import { render } from '../lib/element';
import type { TemplateResult } from '../lib/element';

export { expect, should, assert };

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

export function aTimeout(ms = 0) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

export async function fixture(template: TemplateResult) {
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  render(template, wrapper);
  await nextFrame();
  return wrapper.firstElementChild as any;
}
