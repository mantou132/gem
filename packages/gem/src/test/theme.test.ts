import { createDecoratorTheme, createScopedTheme, createTheme } from '../helper/theme';
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

  it('key 作为变量名后缀', () => {
    expect(createTheme({ textColor: 'red' }, 'k1').textColor).to.equal('var(--text-color-k1)');
    expect(createScopedTheme({ size: '1px' }, 'k2').size).to.equal('var(--size-k2)');
    expect(createDecoratorTheme({ size: '1px' }, 'k3').size).to.equal('var(--size-k3)');
    expect(createTheme({ size: '1px' }).size).to.not.equal(createTheme({ size: '1px' }).size, '没有 key 时随机');
  });
});
