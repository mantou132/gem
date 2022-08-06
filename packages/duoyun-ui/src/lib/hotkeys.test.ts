import { expect } from '@open-wc/testing';

import { matchHotKey } from './hotkeys';

it('`matchHotKey`', () => {
  expect(matchHotKey(new KeyboardEvent('keydown', { ctrlKey: true, code: 'Period' }), 'ctrl+.')).to.equal(true);
  expect(matchHotKey(new KeyboardEvent('keydown', { ctrlKey: true, code: 'Equal' }), 'ctrl+=')).to.equal(true);
});
