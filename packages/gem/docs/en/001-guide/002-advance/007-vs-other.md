# VS other libraries

Gem borrows ideas from other libraries, but Gem still has many unique features. For a detailed comparison with Lit, see [this blog post](../../004-blog/009-gem-vs-lit.md).

### Ability

Gem is a library for the web environment, so it can meet the common needs of WebApp, such as routing, global state and theming, without the need to install other dependencies. The Gem core does not include a UI library or an application framework, they are provided by [DuoyunUI](https://github.com/mantou132/gem/tree/main/packages/duoyun-ui) and [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit).

### Development experience

Unlike other libraries, Gem only uses JavaScript/Typescript to write any part of WebApp and runs without compilation, so it has no syntactic sugar like JSX or single-file components, to complete the same function may require more code, of course, this is also one of the advantages of Gem, you do not need to learn additional languages. The template extensions such as `v-if`, Ref and rest props are also implemented at runtime.

If you want a better experience, such as template diagnosis, you need to install the IDE plugin and build plugin just like you would with other libraries.

### Performance

React calculates the vDOM of the entire component when it needs to be updated, then finds the DOM/Node that needs to be modified through comparison, and finally writes it to the DOM/Node. Gem uses a completely different method, see lit-html [document](https://github.com/lit/lit/blob/main/dev-docs/design/how-lit-html-works.md), before mounting, lit-html found the DOM/Node corresponding to the data in the template string. When updating, directly put the content on the target DOM/Node. In addition, when an element re-renders, only the Attribute/Property of the child elements in the template are updated, the content of child elements is rendered by themselves, and they are only updated when the Attribute/Property/Store they "Observe" changes, which will cause the Gem App to be updated in batches. There is a small task management cost.

When rendering a large number of elements at once, use `@async()` to keep element rendering from blocking the main thread.

### SEO

With [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit), Gem supports server-side rendering (SSR) and static site generation (SSG). Elements using Shadow DOM are output as Declarative Shadow DOM, so search engines can index page content without executing JavaScript, and the page title and `<meta>` are also rendered on the server.
