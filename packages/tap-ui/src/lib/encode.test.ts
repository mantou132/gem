import { expect } from '@mantou/gem/test/utils';

import { arrayBufferToBase64, b64ToUtf8, base64ToArrayBuffer, utf8ToB64 } from './encode';

it('`base64ToArrayBuffer`', () => {
  const str = 'abcdefg';
  const uin8Arr = new TextEncoder().encode(str);
  const base64 = arrayBufferToBase64(uin8Arr.buffer);
  const arrBuf = base64ToArrayBuffer(base64);
  expect(new TextDecoder().decode(arrBuf)).to.equal(str);
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
