# Form actions

Pages handle form submissions with `actions` in their `*.server.ts`. The form is posted to
`<page path>?/<name>` and the action can return data, redirect or throw an error.

## Define an action

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

    // The result must be JSON, it is returned to `submitAction`.
    if (!res.ok) return { errors: (await res.json()).errors };

    cookies.set('token', (await res.json()).user.token);
    redirect(303, '/');
  },
};
```

The action receives the same context as `load`: `params`, `url`, `request`, `cookies` and `locals`.
The return value must be JSON-serializable.

## Actions in layouts

A `_layout.server.ts` can export `actions` too. They work for every page in the layout, so a form in the
layout, such as sign out in the navigation bar, doesn't need to borrow the address of a page:

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

- Actions are looked up from the page outward; the page and inner layouts override actions of the same name
  in outer layouts.
- `params` are the layout params, without the child route part, like the layout `load`.
- On error, the error page renders at the position of the layout.

## Submit from the page

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

`submitAction(form, submitter)` submits the form without reloading the page:
- On `redirect()` it navigates on the client.
- On `error()` it renders the error page in place of the page.
- Otherwise it reloads the current page data, including layout data, and returns the action result.
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
- `303` to the redirect location, or back to the page when the action succeeds without redirecting
- the error page when the action calls `error()`

The action result is dropped in this case. The redirect or error status is preserved.

## Cookies and CSRF

Actions are subject to the same-origin check: cross-site form posts are rejected. Cookies use
`SameSite=Lax` by default, so they are not sent on cross-site form posts either.

Cookies set in an action are added to the response. A page with actions can still be prerendered: the
page is static, and only the form submission needs the server.

## Limitations

Actions are part of the server runtime and are not available on a static host. If a page only needs to
submit data, you can also use an [API route](./006-api-routes.md) and call it from the client.
