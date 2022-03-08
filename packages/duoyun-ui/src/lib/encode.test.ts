import { expect } from '@open-wc/testing';

import { arrayBufferToBase64, base64ToArrayBuffer } from './encode';

it('`base64ToArrayBuffer`', () => {
  const str = 'abcdefg';
  const buffer = new TextEncoder().encode(str);
  expect(new TextDecoder().decode(base64ToArrayBuffer(arrayBufferToBase64(buffer)))).to.equal(str);
});
