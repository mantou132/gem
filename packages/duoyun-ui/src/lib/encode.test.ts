import { expect } from '@open-wc/testing';

import { arrayBufferToBase64, base64ToArrayBuffer, b64ToUtf8, utf8ToB64 } from './encode';

it('`base64ToArrayBuffer`', () => {
  const str = 'abcdefg';
  const buffer = new TextEncoder().encode(str);
  expect(new TextDecoder().decode(base64ToArrayBuffer(arrayBufferToBase64(buffer)))).to.equal(str);
});

it('`utf8ToB64`', () => {
  expect(utf8ToB64('策划师')).to.equal('562W5YiS5biI');
  expect(utf8ToB64('玩儿1')).to.equal('546p5YS/MQ==');
  expect(utf8ToB64('玩儿1', true)).to.equal('546p5YS_MQ');
  expect(utf8ToB64('1234123')).to.equal('MTIzNDEyMw==');
  expect(utf8ToB64('1234123', true)).to.equal('MTIzNDEyMw');
});

it('`base64ToUTF8`', () => {
  expect(b64ToUtf8('562W5YiS5biI')).to.equal('策划师');
  expect(b64ToUtf8('546p5YS_MQ')).to.equal('玩儿1');
  expect(b64ToUtf8('546p5YS/MQ==')).to.equal('玩儿1');
  expect(b64ToUtf8('MTIzNDEyMw')).to.equal('1234123');
  expect(b64ToUtf8('MTIzNDEyMw==')).to.equal('1234123');
});
