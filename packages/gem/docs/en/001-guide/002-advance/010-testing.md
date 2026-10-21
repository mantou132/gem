# Testing

Gem elements are custom elements, so tests should run in a real browser rather than a simulated DOM. [open-wc](https://open-wc.org/testing/#step-by-step-guide) has some practices for Web Components.

## Unit Test

If you use Gem to develop a component library, you can use [wtr](https://modern-web.dev/docs/test-runner/overview/) to run tests in the browser. See Gem's own [configuration](https://github.com/mantou132/gem/blob/main/packages/gem/web-test-runner.config.mjs) for reference.

## E2E

[Playwright](https://playwright.dev/) is recommended. Its locators pierce open Shadow DOM by default, so elements using `@shadow()` can be selected like Light DOM elements, and its assertions wait automatically, which also suits elements rendered with `@async()`:

```ts
import { expect, test } from '@playwright/test';

test('add todo', async ({ page }) => {
  await page.goto('/');
  // Works whether `<dy-input>` and `<dy-button>` use Light DOM or Shadow DOM
  await page.getByRole('textbox').fill('Buy milk');
  await page.getByRole('button', { name: /Add/ }).click();
  await expect(page.getByText('Buy milk')).toBeVisible();
});
```

Playwright can run the same tests in Chromium, Firefox, and WebKit. [Cypress](https://www.cypress.io/) also works; enable its [`includeShadowDom`](https://docs.cypress.io/app/references/configuration) option to select elements inside Shadow DOM.
