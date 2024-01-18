# DuoyunUI 模式

DuoyunUI 提供一些比较复杂的元素，通常由多个 DuoyunUI 元素组成，使用它们可以快速完成一些特定需求，比如创建一个落地页、控制后台，它们有一些独特的特点：

- 元素名称为 `<dy-pat-*>`
- 元素类名为 `DyPat*Element`

## 使用方式

和普通自定义元素一样使用它们，如有必要，可以通过[复制](https://github.com/mantou132/gem/tree/main/packages/duoyun-ui/src/patterns)粘贴进行自定义。

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
> - [使用 React 组件](./60-integrate.md#react)时无需指定 `pattern` 路径，模式元素和其他 DuoyunUI 输出在同一个目录中：
>   ```js
>   import DyPatConsole from 'duoyun-ui/react/DyPatConsole';
>   ```
> - [在 Svelte 中使用时](./60-integrate.md#svelte)导入路径需要添加 `pat` 前缀，例如：
>   ```js
>   import 'duoyun-ui/svelte/pat-console';
>   ```

## 例子

<iframe src="https://examples.gemjs.org/console" loading="lazy"></iframe>
