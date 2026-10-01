import { createTheme } from '../helper/theme';
import { aTimeout, expect } from './utils';

describe('theme 测试', () => {
  it('新增的键更新后立即可读', async () => {
    const theme = createTheme({ color: 'red' }) as any;
    theme({ size: '1px' });
    expect(theme.size).to.match(/^var\(--size-\w+\)$/);

    const el = document.createElement('div');
    el.style.width = theme.size;
    document.body.append(el);
    await aTimeout(0);
    expect(getComputedStyle(el).width).to.equal('1px');
    el.remove();
  });
});
