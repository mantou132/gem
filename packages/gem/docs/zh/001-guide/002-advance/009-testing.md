# 测试

测试 Gem App 和 React/Vue App 有一些差异，比如当前只能使用浏览器环境测试。
[open-wc](https://open-wc.org/testing/#step-by-step-guide) 有一些 WebComponents 的实践。

## 单元测试

如果你使用 Gem 来开发一个组件库，那么可以使用 [wtr](https://modern-web.dev/docs/test-runner/overview/) 来进行测试，
你可以参考 [gem-lib-boilerplate](https://github.com/mantou132/gem-lib-boilerplate/)，来进行配置。

## 端到端测试

可以使用 [cypress](https://www.cypress.io/)，
但选择元素困难（v4.8.0 提供实验性[支持](https://docs.cypress.io/guides/references/experiments.html#Cross-boundary-selectors)）

> [!TIP]
> 可以使用 [`deep-query`](https://github.com/mantou132/deep-query) 帮助选择元素，为 Cypress 添加[自定义命令](http://docs.cypress.io/api/cypress-api/custom-commands.html)即可，
> [Example](https://github.com/mantou132/nesbox/blob/dev/packages/e2e/cypress/support/commands.ts)。
