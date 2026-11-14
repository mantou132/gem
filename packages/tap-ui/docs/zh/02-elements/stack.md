# `<tap-stack>`

类似 iOS 的堆栈导航，推入的页面从右侧滑入，从左边缘向右滑动关闭。
页面默认会推入历史记录栈，所以浏览器或系统的返回按钮也能关闭页面。

## Example

```ts
import { Stack } from '@mantou/tap-ui/elements/stack';

// 推入页面到全局根堆栈
Stack.push({
  content: html`<my-detail-page></my-detail-page>`,
});

// 关闭顶部页面
Stack.pop();
```

在元素中使用最近的堆栈，例如 sheet 中的堆栈：

```ts
Stack.getClosestStack(this)?.push({ content: html`<my-profile-page></my-profile-page>` });
```

## API

<gbp-api name="tap-stack" src="/src/elements/stack.ts"></gbp-api>
