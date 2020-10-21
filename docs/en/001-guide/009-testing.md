# Testing

There are some differences between testing Gem App and React/Vue App, such as testing in the browser environment. [open-wc](https://open-wc.org/testing/#step-by-step-guide) has some practices of WebComponents.

## Unit Test

If you use Gem to develop a component library, you can use [karma](https://karma-runner.github.io/latest/index.html) to test, you can refer to [gem-lib-boilerplate](https://github.com/mantou132/gem-lib-boilerplate/) for configuration.

## E2E

You can use [cypress](https://www.cypress.io/), but it is difficult to select elements (v4.8.0 provides experimental [support](https://docs.cypress.io/guides/references/experiments.html#Cross-boundary-selectors))
