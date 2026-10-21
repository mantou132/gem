# 测试

Gem 元素是自定义元素，测试应该在真实浏览器中运行，而不是模拟的 DOM 环境。
[open-wc](https://open-wc.org/testing/#step-by-step-guide) 有一些 WebComponents 的实践。

## 单元测试

如果你使用 Gem 来开发一个组件库，那么可以使用 [wtr](https://modern-web.dev/docs/test-runner/overview/) 在浏览器中进行测试，
可以参考 Gem 自身的[配置](https://github.com/mantou132/gem/blob/main/packages/gem/web-test-runner.config.mjs)。

## 端到端测试

推荐使用 [Playwright](https://playwright.dev/)。它的定位器默认能穿透开放的 Shadow DOM，使用 `@shadow()` 的元素可以像 Light DOM 元素一样选择；断言会自动等待，也适合使用 `@async()` 渲染的元素：

```ts
import { expect, test } from '@playwright/test';

test('add todo', async ({ page }) => {
  await page.goto('/');
  // 无论 `<dy-input>` 和 `<dy-button>` 使用 Light DOM 还是 Shadow DOM 都能选中
  await page.getByRole('textbox').fill('Buy milk');
  await page.getByRole('button', { name: /Add/ }).click();
  await expect(page.getByText('Buy milk')).toBeVisible();
});
```

Playwright 可以用同一套测试在 Chromium、Firefox 和 WebKit 中运行。也可以使用 [Cypress](https://www.cypress.io/)，开启 [`includeShadowDom`](https://docs.cypress.io/app/references/configuration) 选项后即可选择 Shadow DOM 内的元素。
