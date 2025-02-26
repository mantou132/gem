# DuoyunUI Patterns

DuoyunUI provides some complex elements, typically composed of multiple DuoyunUI elements. Using them can quickly fulfill specific requirements, such as creating a landing page or admin console. They have some unique characteristics:

- Element names are in the format `<dy-pat-*>`
- Element class names are in the format `DyPat*Element`

## Usage

Use them like regular custom elements. If necessary, you can customize them by [copying](https://github.com/mantou132/gem/tree/main/packages/duoyun-ui/src/patterns) and pasting.

```js
import { render, html } from '@mantou/gem';
import 'duoyun-ui/patterns/console';

render(
  html`
    <dy-pat-console
      name="DuoyunUI"
      .logo=${'https://duoyun-ui.gemjs.org/logo.png'}
      .routes=${routes}
      .navItems=${navItems}
      .contextMenus=${contextMenus}
      .userInfo=${userInfo}
      .keyboardAccess=${true}
    ></dy-pat-console>
  `,
  document.body,
);
```

> [!NOTE]
>
> - When [using React components](./60-integrate.md#react), you don't need to specify the `pattern` path. Pattern elements and other DuoyunUI outputs are in the same directory:
>   ```js
>   import DyPatConsole from 'duoyun-ui/react/DyPatConsole';
>   ```
> - When [using in Svelte](./60-integrate.md#svelte), you need to add the `pat` prefix to the import path, for example:
>   ```js
>   import 'duoyun-ui/svelte/pat-console';
>   ```

## Example

<iframe src="https://examples.gemjs.org/console" loading="lazy"></iframe>
