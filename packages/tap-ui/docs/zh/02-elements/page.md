# `<tap-page>`

移动端应用的页面布局，带有页头页脚插槽、安全区域内边距和下拉刷新。
内容在页面自身中滚动，并延伸到页头页脚下方，内边距使内容不被它们遮挡。
不要再添加滚动容器，需要时使用 `scrollElement`。

## Example

```ts
import '@mantou/tap-ui/elements/page';
import '@mantou/tap-ui/elements/navbar';
import '@mantou/tap-ui/elements/content';

const onRefresh = ({ detail: done }: CustomEvent<() => void>) => {
  fetchData().then(done);
};

html`
  <tap-page refreshable @refresh=${onRefresh}>
    <tap-navbar slot="header" title="Chats"></tap-navbar>
    <tap-content>...</tap-content>
    <tap-tabbar slot="footer" .items=${tabs}></tap-tabbar>
  </tap-page>
`;
```

使用 `floatheader` 让页头浮在内容之上，内容滚动前导航栏保持透明。

## API

<gbp-api name="tap-page" src="/src/elements/page.ts"></gbp-api>
