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

for (const native of [true, false]) {
  describe(`binary Base64 (${native ? 'native' : 'fallback'})`, () => {
    const fromBase64 = Object.getOwnPropertyDescriptor(Uint8Array, 'fromBase64');
    const toBase64 = Object.getOwnPropertyDescriptor(Uint8Array.prototype, 'toBase64');

    before(function () {
      if (native && (!fromBase64?.value || !toBase64?.value)) this.skip();
    });

    beforeEach(() => {
      if (native) return;
      Object.defineProperty(Uint8Array, 'fromBase64', { configurable: true, value: undefined });
      Object.defineProperty(Uint8Array.prototype, 'toBase64', { configurable: true, value: undefined });
    });

    afterEach(() => {
      if (native) return;
      if (fromBase64) Object.defineProperty(Uint8Array, 'fromBase64', fromBase64);
      else Reflect.deleteProperty(Uint8Array, 'fromBase64');
      if (toBase64) Object.defineProperty(Uint8Array.prototype, 'toBase64', toBase64);
      else Reflect.deleteProperty(Uint8Array.prototype, 'toBase64');
    });

    it('preserves standard and URL-safe encoding, including empty input and padding', () => {
      for (const [text, expected] of [
        ['', ''],
        ['f', 'Zg=='],
        ['fo', 'Zm8='],
        ['foo', 'Zm9v'],
        ['foob', 'Zm9vYg=='],
        ['fooba', 'Zm9vYmE='],
        ['foobar', 'Zm9vYmFy'],
      ]) {
        const bytes = new TextEncoder().encode(text);
        const safe = expected.replaceAll('=', '');
        expect(arrayBufferToBase64(bytes.buffer)).to.equal(expected);
        expect(arrayBufferToBase64(bytes.buffer, true)).to.equal(safe);
        expect(new TextDecoder().decode(base64ToArrayBuffer(expected))).to.equal(text);
        expect(new TextDecoder().decode(base64ToArrayBuffer(safe))).to.equal(text);
      }
      const bytes = new Uint8Array([251, 255]);
      expect(arrayBufferToBase64(bytes.buffer)).to.equal('+/8=');
      expect(arrayBufferToBase64(bytes.buffer, true)).to.equal('-_8');
      expect([...new Uint8Array(base64ToArrayBuffer('-_8'))]).to.deep.equal([251, 255]);
    });

    it('preserves atob whitespace, alphabet, and loose trailing-bit behavior', () => {
      for (const text of [' Zg==\n', 'Z\tg\r\n', 'Zg\f==', '+_8=', '-/8', 'Zh', 'Zh==', 'Zm9=']) {
        const expected = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
        expect([...new Uint8Array(base64ToArrayBuffer(text))]).to.deep.equal(
          [...expected].map((char) => char.charCodeAt(0)),
        );
      }
    });

    it('rejects invalid characters, lengths, and padding', () => {
      for (const text of ['A', 'Zg=', '====', 'AA===', 'Zg===', 'Zg==A', 'Z=g=', '?', 'Zg\v', 'Zg\u00a0']) {
        expect(() => base64ToArrayBuffer(text)).to.throw();
      }
    });

    it('handles chunk boundaries and large binary buffers without argument overflow', () => {
      const pattern = String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i));
      for (const size of [32765, 32766, 32767, 1024 * 1024 + 1]) {
        const binary = pattern.repeat(Math.ceil(size / 256)).slice(0, size);
        const bytes = new Uint8Array(size);
        for (let i = 0; i < size; i++) bytes[i] = i % 256;
        const expected = btoa(binary);
        const safe = expected.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
        expect(arrayBufferToBase64(bytes.buffer)).to.equal(expected);
        expect(arrayBufferToBase64(bytes.buffer, true)).to.equal(safe);
        expect(arrayBufferToBase64(base64ToArrayBuffer(safe))).to.equal(expected);
      }
    });
  });
}
