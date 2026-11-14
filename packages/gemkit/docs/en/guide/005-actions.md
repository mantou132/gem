# Form actions

Pages handle form submissions with `actions` in their `*.server.ts`. The form is posted to
`<page path>?/<name>` and the action can return data, return a failure with `fail`, redirect or throw an error.

## Define an action

```ts
// src/pages/login.server.ts
import type { ServerContext } from '@mantou/gemkit';

export const actions = {
  login: async ({ request, cookies }: ServerContext) => {
    const form = await request.formData();
    const res = await fetch(`${API}/users/login`, {
      method: 'POST',
      body: JSON.stringify({ name: form.get('name'), password: form.get('password') }),
    });

    // The result must be JSON, it is returned to `submitAction` and kept in `actionStore`.
    if (!res.ok) return fail(422, { errors: (await res.json()).errors });

    cookies.set('token', (await res.json()).user.token);
    redirect(303, '/');
  },
};
```

The action receives the same context as `load`: `params`, `url`, `request`, `cookies` and `locals`.
The return value must be JSON-serializable.

## Failures

When the action does not succeed, for example when an external service returns an error, return
`fail(status, data)` instead of plain data. Compared to returning plain data:
- Without JavaScript there is no redirect: the current page is rendered with `status`, and the page reads the
  result from `actionStore`, see [Without JavaScript](#without-javascript).
- `submitAction` does not reload the page data, since the action changed nothing.
- The `formActions` callback and `submitAction` receive `{ type: 'failure', status, data }`, and
  `{ type: 'success', status: 200, data }` on success.

## Validate input

`action(schema, handler)` validates the form data with a [Standard Schema](https://standardschema.dev) (zod,
valibot, arktype, ...), like [`endpoint`](./006-api-routes.md#validate-input) does for API routes:

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

- `request.formData()` is converted to an object and validated; the second parameter is the schema output.
- When validation fails it returns `fail(400, { issues })`. `issues` are the validation issues, their `path` is the
  field, so errors can be shown next to the fields.
- Form values are strings (files are `File`), use the schema's conversions such as `z.coerce.number()`.
- Fields with the same name (such as checkboxes) are arrays. To always get an array, even with a single checked
  value, end the field name with `[]`, such as `name="tags[]"`, which gives the field `tags`. `formDataToObject(formData)`
  can also be used directly.

## Actions in layouts

A `_layout.server.ts` can export `actions` too. They work for every page in the layout, so a form in the
layout, such as sign out in the navigation bar, doesn't need to borrow the address of a page:

```ts
// src/pages/_layout.server.ts
export const actions = {
  logout: ({ cookies }: ServerContext) => {
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

- Actions are looked up from the page outward; the page and inner layouts override actions of the same name
  in outer layouts.
- `params` are the layout params, without the child route part, like the layout `load`.
- On error, the error page renders at the position of the layout.

## Submit from the page

`formActions` uses the generated `FormActions` type (see [Param types](./001-routing.md#param-types)), so action
names and results are type-checked. `import type` only references the types and does not bundle server code into
the client:

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

`login(callback)` returns rest properties for the form: `method="post"`, `action="?/login"` and an
`onsubmit` that calls `submitAction`. `method` and `action` are rendered on the server too, so the form
submits correctly before hydration or without JavaScript. `action` keeps the query parameters of the current page,
for example `?/sign&page=2` in `/guestbook?page=2`, so page 2 is rendered or redirected back to after submitting.

The callback receives the action result and the form. The result is told apart by `type`:

| `type`       | Other fields          | Description                                                         |
| ------------ | --------------------- | ------------------------------------------------------------------- |
| `'success'`  | `status: 200`, `data` | The return value of the action, `undefined` when it returns nothing |
| `'failure'`  | `status`, `data`      | `fail(status, data)`                                                |
| `'redirect'` | `location`            | `redirect()`, already navigated to the location                     |
| `'error'`    | `error`               | `error()` or a thrown error, the error page is already rendered     |

`data` has the type after JSON conversion (see [`Jsonify`](../reference/002-api.md#jsonify)). For example, to clear
the inputs unless the action failed: `login((result, form) => result.type !== 'failure' && form.reset())`.

`FormActions` includes the actions of the parent layouts, so a page can submit to layout actions too. Inner actions
override outer ones with the same name, matching the lookup order on submit:

```ts
const { login, logout } = formActions<FormActions>(); // `logout` is in `_layout.server.ts`
```

Without generated types (for example in elements outside `src/pages`), use `formActions<typeof actions>()`.

To control the submission yourself, use `submitAction(form, submitter)` directly:

```ts
html`<form method="post" action="?/login" @submit=${this.#submit}></form>`;

#submit = async (evt: SubmitEvent) => {
  evt.preventDefault();
  const result = await submitAction(evt.target as HTMLFormElement, evt.submitter);
};
```

`submitAction` submits the form without reloading the page:
- On `redirect()` it navigates on the client.
- On `error()` it renders the error page in place of the page.
- On `fail()` it does not reload the data.
- Otherwise it reloads the current page data, including layout data.
- It returns the same result as the `formActions` callback; `submitAction` does not know which action it is,
  so the result is untyped.
- Successful and `fail()` results are also kept in `actionStore`.
- It resolves after the page is rendered, so the new data is already on the page.
  The page element is reused, so input state is kept, and the scroll position does not change.

During the request the form has the `aria-busy` attribute:

```css
form[aria-busy] button {
  opacity: 0.5;
}
```

## Without JavaScript

The form is a normal HTML form. Without JavaScript the browser submits it and Gemkit responds with:
- `303` to the redirect location, or back to the page when the action succeeds without redirecting (other
  query parameters such as `?page=2` are kept), so reloading the page does not submit again
- the current page rendered with the failure status when the action returns `fail()`, with the result in
  `actionStore`
- the error page when the action calls `error()`

A successful result is dropped. To show errors without JavaScript too, read them from the `result` of the action
instead of relying only on the `formActions` callback:

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

`login.result` is the last successful or `fail()` result of `login`, with the same type as the callback result, and
`undefined` before submitting or after submitting another action. It is read from `actionStore`, so the element needs
`@connectStore(actionStore)`.

`actionStore` is `{ name, result }`, `name` is the action name. It is set during server rendering and synced to the
client on hydration; it is also updated after `submitAction` and cleared when navigating to another page.

## Cookies and CSRF

Actions are subject to the same-origin check: cross-site form posts are rejected. Cookies use
`SameSite=Lax` by default, so they are not sent on cross-site form posts either.

Cookies set in an action are added to the response. A page with actions can still be prerendered: the
page is static, and only the form submission needs the server.

## Limitations

Actions are part of the server runtime and are not available on a static host. If a page only needs to
submit data, you can also use an [API route](./006-api-routes.md) and call it from the client.
