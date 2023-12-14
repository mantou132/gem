# Testing

There are some differences between testing Gem App and React/Vue App, such as testing in the browser environment. [open-wc](https://open-wc.org/testing/#step-by-step-guide) has some practices of WebComponents.

## Unit Test

If you use Gem to develop a component library, you can use [wtr](https://modern-web.dev/docs/test-runner/overview/) to test, you can refer to [gem-lib-boilerplate](https://github.com/mantou132/gem-lib-boilerplate/) for configuration.

## E2E

You can use [cypress](https://www.cypress.io/), but it is difficult to select elements (v4.8.0 provides experimental [support](https://docs.cypress.io/guides/references/experiments.html#Cross-boundary-selectors))

> [!TIP]
> Can use [`deep-query`](https://github.com/mantou132/deep-query) to help select elements and add [custom commands](http://docs.cypress.io/api/cypress-api/custom-commands.html) to Cypress,
> [Example](https://github.com/mantou132/nesbox/blob/dev/packages/e2e/cypress/support/commands.ts).
