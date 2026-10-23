# 表单 actions

页面在 `*.server.ts` 中使用 `actions` 处理表单提交。表单提交到 `<页面路径>?/<名称>`，
action 可以返回数据、跳转或者抛出错误。

## 定义 action

```ts
// src/pages/login.server.ts
import type { ServerLoadContext } from '@mantou/gemkit';

export const actions = {
  login: async ({ request, cookies }: ServerLoadContext) => {
    const form = await request.formData();
    const res = await fetch(`${API}/users/login`, {
      method: 'POST',
      body: JSON.stringify({ name: form.get('name'), password: form.get('password') }),
    });

    // 结果必须是 JSON，它会返回给 `submitAction`。
    if (!res.ok) return { errors: (await res.json()).errors };

    cookies.set('token', (await res.json()).user.token);
    redirect(303, '/');
  },
};
```

action 的参数和 `load` 相同：`params`、`url`、`request`、`cookies` 和 `locals`。
返回值必须可以序列化成 JSON。

## 布局中的 action

`_layout.server.ts` 也可以导出 `actions`，对布局中的所有页面都有效，布局中的表单（例如导航栏的退出登录）
不需要借用某个页面的地址：

```ts
// src/pages/_layout.server.ts
export const actions = {
  logout: ({ cookies }: ServerLoadContext) => {
    cookies.delete('token');
    redirect(303, '/');
  },
};
```

```ts
// src/pages/_layout.ts
html`<form method="post" action="?/logout" @submit=${this.#submit}><button>Sign out</button></form>`;
```

- 从页面开始逐层向外查找，页面和内层布局的同名 action 覆盖外层的。
- `params` 是布局的参数，不包括子路由的部分，和布局的 `load` 一样。
- 出错时错误页面渲染在布局的位置。

## 在页面中提交

```ts
// src/pages/login.ts
@page('Sign in')
export default class LoginPage extends GemElement {
  #state = createState<{ errors?: string[] }>({});

  #submit = async (evt: SubmitEvent) => {
    evt.preventDefault();
    const result = await submitAction(evt.target as HTMLFormElement, evt.submitter);
    this.#state({ errors: result?.errors });
  };

  @template()
  #content = () => html`
    <form method="post" action="?/login" @submit=${this.#submit}>
      <input name="name" required />
      <input name="password" type="password" required />
      <button type="submit">Sign in</button>
    </form>
    ${this.#state.errors?.map((error) => html`<p>${error}</p>`)}
  `;
}
```

`submitAction(form, submitter)` 提交表单，不刷新页面：
- `redirect()` 时在客户端导航。
- `error()` 时在页面的位置渲染错误页面。
- 其他情况重新加载当前页面的数据（包括布局数据），并返回 action 的结果。
  页面元素会被复用，所以输入框的状态保留，滚动位置不变。

请求期间表单带有 `aria-busy` 属性：

```css
form[aria-busy] button {
  opacity: 0.5;
}
```

## 没有 JavaScript 时

表单是普通的 HTML 表单。没有 JavaScript 时浏览器直接提交，Gemkit 的响应是：
- `303` 跳转到目标地址，或者 action 成功但没有跳转时返回当前页面
- action 调用 `error()` 时返回错误页面

这种情况下 action 的结果会被丢弃，跳转或者错误的状态码会保留。

## Cookie 和 CSRF

action 有同源检查，跨站的表单提交会被拒绝。cookie 默认使用 `SameSite=Lax`，
所以跨站表单提交也不会携带它们。

action 中设置的 cookie 会添加到响应中。带 actions 的页面仍然可以预渲染：
页面是静态的，只有表单提交需要服务器。

## 限制

actions 属于服务端运行时，静态托管不可用。如果页面只需要提交数据，
也可以使用 [API 路由](./006-api-routes.md)，在客户端调用它。
