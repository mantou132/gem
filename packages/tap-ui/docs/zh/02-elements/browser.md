# `<tap-browser>`

应用内浏览器，在推入 [`<tap-stack>`](./stack.md) 的 iframe 页面中打开 URL，
带有导航栏和用于自定义操作的动作面板。

## Example

```ts
import { Browser } from '@mantou/tap-ui/elements/browser';

// 关闭后完成
await Browser.open({
  src: 'https://example.com',
  title: 'Help',
  items: [{ label: 'Share', handler: () => share() }],
});
```

## API

<gbp-api name="tap-browser" src="/src/elements/browser.ts"></gbp-api>
