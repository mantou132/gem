# 表单 actions

页面在 `*.server.ts` 中使用 `actions` 处理表单提交。表单提交到 `<页面路径>?/<名称>`，
action 可以返回数据、使用 `fail` 返回失败的结果、跳转或者抛出错误。

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

    // 结果必须是 JSON，它会返回给 `submitAction`，也会保存在 `actionStore` 中。
    if (!res.ok) return fail(422, { errors: (await res.json()).errors });

    cookies.set('token', (await res.json()).user.token);
    redirect(303, '/');
  },
};
```

action 的参数和 `load` 相同：`params`、`url`、`request`、`cookies` 和 `locals`。
返回值必须可以序列化成 JSON。

## 失败的结果

表单校验失败这类情况使用 `fail(status, data)`，不要直接返回数据：

```ts
import { z } from 'zod';

const Login = z.object({ name: z.string().trim().min(1), password: z.string().min(1) });

export const actions = {
  login: async ({ request }: ServerLoadContext) => {
    const parsed = Login.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success)
      return fail(400, { errors: parsed.error.issues.map((issue) => issue.message) });
    // ...
  },
};
```

和直接返回数据的区别：
- 没有 JavaScript 时不跳转，使用 `status` 渲染当前页面，页面从 `actionStore` 中读取结果，见[没有 JavaScript 时](#没有-javascript-时)。
- `submitAction` 不重新加载页面的数据，因为 action 没有修改任何东西。
- `formActions` 的回调和 `submitAction` 得到的是 `data`。

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
import type { actions } from './_layout.server';

const { logout } = formActions<typeof actions>();

html`<form ${logout()}><button>Sign out</button></form>`;
```

- 从页面开始逐层向外查找，页面和内层布局的同名 action 覆盖外层的。
- `params` 是布局的参数，不包括子路由的部分，和布局的 `load` 一样。
- 出错时错误页面渲染在布局的位置。

## 在页面中提交

`formActions` 使用 `*.server.ts` 中 `actions` 的类型，action 的名称和结果都有类型检查。
`import type` 只引用类型，不会把服务端代码打包到客户端：

```ts
// src/pages/login.ts
import type { actions } from './login.server';

const { login } = formActions<typeof actions>();

@page('Sign in')
export default class LoginPage extends GemElement {
  #state = createState<{ errors?: string[] }>({});

  @template()
  #content = () => html`
    <form ${login((data) => this.#state({ errors: data?.errors }))}>
      <input name="name" required />
      <input name="password" type="password" required />
      <button type="submit">Sign in</button>
    </form>
    ${this.#state.errors?.map((error) => html`<p>${error}</p>`)}
  `;
}
```

`login(callback)` 返回表单的剩余属性：`method="post"`、`action="?/login"` 和提交时调用 `submitAction` 的
`onsubmit`。服务端渲染时也会输出 `method` 和 `action`，所以水合前或者没有 JavaScript 时表单也能正常提交。
回调的参数是 action 的结果（`fail` 时是它的 `data`，跳转或者出错时是 `undefined`）和表单，
例如成功后用 `form.reset()` 清空输入。

页面也可以提交到布局的 action，合并它们的类型即可：

```ts
import type { actions } from './login.server';
import type { actions as layoutActions } from './_layout.server';

const { login, logout } = formActions<typeof actions & typeof layoutActions>();
```

需要自己控制提交时，可以直接使用 `submitAction(form, submitter)`：

```ts
html`<form method="post" action="?/login" @submit=${this.#submit}></form>`;

#submit = async (evt: SubmitEvent) => {
  evt.preventDefault();
  const data = await submitAction(evt.target as HTMLFormElement, evt.submitter);
};
```

`submitAction` 提交表单，不刷新页面：
- `redirect()` 时在客户端导航。
- `error()` 时在页面的位置渲染错误页面。
- `fail()` 时不重新加载数据，返回它的 `data`。
- 其他情况重新加载当前页面的数据（包括布局数据），并返回 action 的结果。
- 结果同时保存在 `actionStore` 中。
- 页面渲染后才 resolve，此时页面上已经是新数据。
  页面元素会被复用，所以输入框的状态保留，滚动位置不变。

请求期间表单带有 `aria-busy` 属性：

```css
form[aria-busy] button {
  opacity: 0.5;
}
```

## 没有 JavaScript 时

表单是普通的 HTML 表单。没有 JavaScript 时浏览器直接提交，Gemkit 的响应是：
- `303` 跳转到目标地址，或者 action 成功但没有跳转时返回当前页面（保留其他查询参数，例如 `?page=2`），
  刷新页面不会重复提交
- action 返回 `fail()` 时不跳转，使用它的状态码渲染当前页面，结果保存在 `actionStore` 中
- action 调用 `error()` 时返回错误页面

成功的结果会被丢弃。要在没有 JavaScript 时也显示错误，从 `actionStore` 读取，而不是只依赖 `formActions` 的回调：

```ts
@page('Sign in')
@connectStore(actionStore)
export default class LoginPage extends GemElement {
  @template()
  #content = () => html`
    <form ${login()}>...</form>
    <p v-if=${actionStore.name === 'login'}>${actionStore.data?.errors?.join(', ')}</p>
  `;
}
```

`actionStore` 是 `{ name, status, data }`：`name` 是 action 的名称，`status` 是 `fail` 的状态码（成功时是 `200`），
`data` 是结果。服务端渲染时设置，水合时同步到客户端；`submitAction` 提交后也会更新，导航到其他页面时清空。

## Cookie 和 CSRF

action 有同源检查，跨站的表单提交会被拒绝。cookie 默认使用 `SameSite=Lax`，
所以跨站表单提交也不会携带它们。

action 中设置的 cookie 会添加到响应中。带 actions 的页面仍然可以预渲染：
页面是静态的，只有表单提交需要服务器。

## 限制

actions 属于服务端运行时，静态托管不可用。如果页面只需要提交数据，
也可以使用 [API 路由](./006-api-routes.md)，在客户端调用它。
