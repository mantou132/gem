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

action 没有成功时（例如外部服务返回错误）使用 `fail(status, data)`，不要直接返回数据。和直接返回数据的区别：
- 没有 JavaScript 时不跳转，使用 `status` 渲染当前页面，页面从 `actionStore` 中读取结果，见[没有 JavaScript 时](#没有-javascript-时)。
- `submitAction` 不重新加载页面的数据，因为 action 没有修改任何东西。
- `formActions` 的回调和 `submitAction` 得到的结果是 `{ type: 'failure', status, data }`，成功时是 `{ type: 'success', status: 200, data }`。

## 校验输入

`action(schema, handler)` 使用 [Standard Schema](https://standardschema.dev)（zod、valibot、arktype 等）
校验表单数据，和 API 路由的 [`endpoint`](./006-api-routes.md#校验输入) 一样：

```ts
// src/pages/login.server.ts
import { z } from 'zod';

import type { Actions } from './login.$types';

const Login = z.object({ name: z.string().trim().min(1), password: z.string().min(1) });

export const actions = {
  login: action(Login, async ({ cookies }, { name, password }) => {
    // ...
  }),
} satisfies Actions;
```

- 读取 `request.formData()` 转换成对象再校验，第二个参数是 schema 的输出。
- 校验失败时返回 `fail(400, { issues })`，`issues` 是校验的问题，`path` 是出错的字段，可以在字段旁边显示错误。
- 表单的值都是字符串（文件是 `File`），需要转换类型时使用 schema 的转换，例如 `z.coerce.number()`。
- 同名的字段（例如多选框）是数组；只选中一个时也需要数组，字段名以 `[]` 结尾，例如 `name="tags[]"`，
  得到的字段是 `tags`。也可以直接使用 `formDataToObject(formData)`。

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
import type { FormActions } from './_layout.$types';

const { logout } = formActions<FormActions>();

html`<form ${logout()}><button>Sign out</button></form>`;
```

- 从页面开始逐层向外查找，页面和内层布局的同名 action 覆盖外层的。
- `params` 是布局的参数，不包括子路由的部分，和布局的 `load` 一样。
- 出错时错误页面渲染在布局的位置。

## 在页面中提交

`formActions` 使用生成的 `FormActions` 类型（见[参数类型](./001-routing.md#参数类型)），action 的名称和结果都有类型检查。
`import type` 只引用类型，不会把服务端代码打包到客户端：

```ts
// src/pages/login.ts
import type { FormActions } from './login.$types';

const { login } = formActions<FormActions>();

@page('Sign in')
export default class LoginPage extends GemElement {
  #state = createState<{ errors?: string[] }>({});

  @template()
  #content = () => html`
    <form ${login((result) => result.type === 'failure' && this.#state({ errors: result.data.errors }))}>
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
`action` 保留当前页面的查询参数，例如在 `/guestbook?page=2` 中是 `?/sign&page=2`，提交后渲染或者跳转回的仍然是第 2 页。

回调的参数是 action 的结果和表单，结果使用 `type` 区分：

| `type`       | 其他字段              | 说明                                                |
| ------------ | --------------------- | --------------------------------------------------- |
| `'success'`  | `status: 200`、`data` | action 的返回值，没有返回值时 `data` 是 `undefined` |
| `'failure'`  | `status`、`data`      | `fail(status, data)`                                |
| `'redirect'` | `location`            | `redirect()`，已经导航到这个地址                    |
| `'error'`    | `error`               | `error()` 或者抛出的错误，已经渲染错误页面          |

`data` 是转换成 JSON 后的类型（见 [`Jsonify`](../reference/002-api.md#jsonify)）。
例如没有失败时用 `form.reset()` 清空输入：`login((result, form) => result.type !== 'failure' && form.reset())`。

`FormActions` 包括上层布局的 actions，所以页面也可以提交到布局的 action，内层同名的覆盖外层的，和提交时的查找顺序一致：

```ts
const { login, logout } = formActions<FormActions>(); // `logout` 在 `_layout.server.ts` 中
```

没有生成的类型时（例如不在 `src/pages` 中的元素），使用 `formActions<typeof actions>()`。

需要自己控制提交时，可以直接使用 `submitAction(form, submitter)`：

```ts
html`<form method="post" action="?/login" @submit=${this.#submit}></form>`;

#submit = async (evt: SubmitEvent) => {
  evt.preventDefault();
  const result = await submitAction(evt.target as HTMLFormElement, evt.submitter);
};
```

`submitAction` 提交表单，不刷新页面：
- `redirect()` 时在客户端导航。
- `error()` 时在页面的位置渲染错误页面。
- `fail()` 时不重新加载数据。
- 其他情况重新加载当前页面的数据（包括布局数据）。
- 返回和 `formActions` 回调一样的结果，`submitAction` 不知道是哪个 action，所以结果没有类型。
- 成功和 `fail()` 的结果同时保存在 `actionStore` 中。
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

成功的结果会被丢弃。要在没有 JavaScript 时也显示错误，从 action 的 `result` 读取，而不是只依赖 `formActions` 的回调：

```ts
const { login } = formActions<FormActions>();

@page('Sign in')
@connectStore(actionStore)
export default class LoginPage extends GemElement {
  @template()
  #content = () => html`
    <form ${login()}>...</form>
    <p v-if=${login.result?.type === 'failure'}>${login.result?.data.errors.join(', ')}</p>
  `;
}
```

`login.result` 是 `login` 最后一次成功或者 `fail()` 的结果，和回调的结果类型一样，没有提交过或者提交的是其他 action 时是 `undefined`。
它从 `actionStore` 读取，所以元素需要 `@connectStore(actionStore)`。

`actionStore` 是 `{ name, result }`，`name` 是 action 的名称。服务端渲染时设置，水合时同步到客户端；
`submitAction` 提交后也会更新，导航到其他页面时清空。

## Cookie 和 CSRF

action 有同源检查，跨站的表单提交会被拒绝。cookie 默认使用 `SameSite=Lax`，
所以跨站表单提交也不会携带它们。

action 中设置的 cookie 会添加到响应中。带 actions 的页面仍然可以预渲染：
页面是静态的，只有表单提交需要服务器。

## 限制

actions 属于服务端运行时，静态托管不可用。如果页面只需要提交数据，
也可以使用 [API 路由](./006-api-routes.md)，在客户端调用它。
