# 主题

[CSS 变量](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) 能轻松实现主题。使用 Gem 提供的主题模块将有更多当优势：

- TypeScript 集成
- 防止多个主题 CSS 自定义属性名冲突
- 可观察的 `ThemeStore` 对象

## 开始

```js
import { createTheme } from '@mantou/gem/helper/theme';

const theme = createTheme({
  primaryColor: '#eee',
});

const styles = css`
  div {
    border: 2px solid ${theme.primaryColor};
  }
`;

@customElement('app-root')
@adoptedStyle(styles)
class App extends GemElement {}
```

## 读取主题原始对象

从上面的用法可以看出，一旦一个对象被创建成主题，从主题中读取的字段即为 CSS 变量：

```js
console.log(theme.primaryColor);
// => var(--primary-color-xxxxx)
```

有时候可能需要读取原始对象，比如将主题打印到元素中：

```js 7,16,21
import { createTheme, getThemeStore } from '@mantou/gem/helper/theme';

const theme = createTheme({
  primaryColor: '#eee',
});

const themeStore = getThemeStore(theme);

const styles = css`
  div {
    border: 2px solid ${theme.primaryColor};
  }
`;

@customElement('app-root')
@adoptedStyle(styles)
@connectStore(themeStore)
class App extends GemElement {
  render = () => {
    return html`
      <div>primaryColor: ${themeStore.primaryColor}</div>
    `;
  }
}
```

## 暗模式

如果想要支持暗模式，你可以利用 [`matchMedia`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) 进行媒体查询，然后使用不同的主题，例如：

```js 11
import { createTheme } from '@mantou/gem/helper/theme';

const lightTheme = {
  primaryColor: '#333',
};

const darkTheme = {
  primaryColor: '#eee',
};

const theme = createTheme(matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme : lightTheme);

const styles = css`
  div {
    border: 2px solid ${theme.primaryColor};
  }
`;

@customElement('app-root')
@adoptedStyle(styles)
class App extends GemElement {}
```

## 范围主题和覆盖主题

<gbp-include src="../../snippets/scoped-theme.md"></gbp-include>

## 元素级主题 {#element-level-theme}

主题是使用 CSS 变量实现的，在渲染时可能需要动态设置 CSS 变量，这同样可以通过主题来完成，和其他类型的主题不一样，需要使用装饰器来应用和更新主题：

```js
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

const elementTheme = createDecoratorTheme({ color: '' });

const style = css`
  :host(:where(:not([hidden]))) {
    border-color: ${elementTheme.color};
  }
`;

@customElement('app-root')
class App extends GemElement {
  @attribute color;

  @elementTheme()
  #theme = () => ({ color: this.color })

  render = () => {
    return html``;
  }
}
```
