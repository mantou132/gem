# 测试

测试 Gem App 和 React/Vue App 有一些差异，比如当前只能使用浏览器环境测试。
[open-wc](https://open-wc.org/testing/#step-by-step-guide) 有一些 WebComponents 的实践。

## 单元测试

如果你使用 Gem 来开发一个组件库，那么可以使用 [karma](https://karma-runner.github.io/latest/index.html) 来进行测试，
你可以参考 [gem-lib-boilerplate](https://github.com/mantou132/gem-lib-boilerplate/)，来进行配置。

## 端到端测试

可以使用 [cypress](https://www.cypress.io/)，
但选择元素困难（v4.8.0 提供实验性[支持](https://docs.cypress.io/guides/references/experiments.html#Cross-boundary-selectors)）

<!-- 你可以参考 [gem-lib-boilerplate](https://github.com/mantou132/gem-boilerplate/)，来进行配置。 -->
