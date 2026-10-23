# Rendering

This page follows the main scenarios and describes where each step gets its content, and why Gemkit
works that way.

## Participants

| Name                     | Description                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| layout / page            | Elements in `src/pages`, `<gemkit-outlet>` matches and renders them from the root route down.       |
| `load` option            | Isomorphic data loading, runs on the server and on client navigation.                               |
| `*.server.ts`            | Server-only `load`, `actions` and `paths`; the client gets the result from a data file.             |
| Server element           | An element marked with `@server()`, renders HTML only; the client neither loads nor hydrates it.    |
| Lazy element             | An element marked with `@lazy()`, shows server HTML and hydrates when its code is loaded on demand. |
| `__data.json`            | `<page path>/__data.json`, the server data of the page and all layouts.                             |
| `__elements.json`        | `<page path>/__elements.json`, the HTML of server and lazy elements, only when prerendering.        |
| `POST /__gemkit_element` | Renders elements on demand; elements in the same round share one request.                           |

## Deployment

|                          | Development (`rsbuild dev`) | `gemkit start`                                         | Static host            |
| ------------------------ | --------------------------- | ------------------------------------------------------ | ---------------------- |
| Page HTML                | Rendered per request        | Prerendered file first, otherwise rendered per request | Prerendered pages only |
| `__data.json`            | Generated per request       | Prerendered file first                                 | Prerendered pages only |
| `__elements.json`        | Not requested by the client | Only for prerendered pages, otherwise `{}`             | Prerendered pages only |
| `POST /__gemkit_element` | Available                   | Available                                              | Not available          |
| Form `actions`           | Available                   | Available                                              | Not available          |
- **Requests with a query**: `gemkit start` doesn't use the prerendered file, because `load` may read
  `url.searchParams` and the result differs from prerendering.
- **Which pages are prerendered**: no `prerender = false`, `handle` didn't read `request` or `cookies`,
  and no redirect or error. Personal content can't be written to a static file. `load` must not read the
  request or cookies either; export `prerender = false` in that case.
- **Development and `prerender: false`**: no `__elements.json` is generated, and the client requests
  elements from the server. This is fixed at build time (`process.env.GEMKIT_PRERENDER`), so the client
  skips a request that would always be empty.

## First load (server rendering and prerendering)

Prerendering runs the same render for every path at build time and writes the files.
1. **Run `handle`**: runs `handle` from `src/app.server.ts`, for example to read the current user.
   - On redirect, respond with the redirect.
   - On error, the error page is rendered at the position of the first route with a server module.
     The client requests data for the same route, so both sides show the same result.
2. **Render the app**: `<gemkit-outlet>` matches routes from the root, running layout and page `load`.
   Server data calls `*.server.ts` directly, without a data file.
3. **Wait before outputting the document**: output starts after the page data and title are known.
   - The status code (404, error) and `<title>` and `<meta>` are in the document head, so they must be
     known first.
   - A redirect in `load` outputs nothing and responds with the redirect.
4. **Stream the rest**: later async content, such as `@server()` methods, streams without blocking the
   content before it.
5. **Output the data**: layout and page data (`<script type="application/json">`) and stores updated on
   the server are output at the end. Hydration uses them without a request.
6. **Server elements**: server element and lazy element HTML is output in the page with the `ssr-server`
   attribute.
   - When prerendering, it is also collected into `__elements.json`.
   - On client navigation the elements are created on the client and have no server content, so they get
     it from this file.

## Hydration

1. **Prepare the routes**: the client entry sets the routes before defining `<gemkit-outlet>`.
   - The server `<gemkit-outlet>` upgrades as soon as it is defined, so the routes must exist first.
2. **Render the routes**: routes load layout and page modules. `load` takes the data output in the page
   (`takeSSRData`) and sends no request.
   - A route that failed on the server renders the error page, matching the server result.
   - The first load data is also written to the history cache, see [Back and forward](#back-and-forward).
3. **Hydrate elements**: normal elements reuse the server nodes and bind events.
   - Elements with restored server state skip `@server()` methods in the first effects, because they
     already ran on the server.
4. **Server elements**: keep the server content and don't hydrate.
5. **Lazy elements**: keep the server content and don't load the code yet. Load and hydrate by the `on`
   option, the default is on user interaction.
   - The code is loaded on the first interaction (`pointerdown`, `click`, `focusin`, `keydown`, `input`).
   - After loading, the element upgrades, hydrates and replays the triggering event on the original
     target.
   - The reason is that rarely used parts, such as a like button, don't need to be downloaded at first.
6. **Scroll position**: keep the position restored by the browser, for example after a reload.

## Client navigation to a new history entry

Clicking a `<gem-link>`, calling `history.push` or `replace` creates a new history entry and always gets
fresh content.
1. **Prefetch**: starts when the link is hovered or focused, or at navigation time if not prefetched yet.
   Prefetch includes:
   - the layout and page modules of the target route
   - `__data.json`, only when needed. If every route with a server module is a reusable layout, it is
     not requested.
   - `__elements.json`, only when prerendering is enabled. It is always requested because the client
     only knows whether the page has server elements after rendering.

   A prefetch result is used once by a navigation within 30 seconds. This lets modules, data and
   elements load in parallel instead of waiting for rendering to reach them.
2. **Render routes layer by layer**: the outlet matches from the root. After a layout renders, its inner
   outlet matches the child route.
   - When leaving a layout, the outlet that is about to be removed also reacts to the route change, but
     it can't match the current path, so it doesn't load. Otherwise it would load the 404 page and
     overwrite the title.
3. **Layout data**: when navigating between child routes, reuse the rendered layout data if its params
   didn't change. After a form submission, don't reuse.
4. **Page data**: layouts and the page share one `__data.json` request, preferring the prefetched result.
   - `load` receives the server data as `data`. Without `load`, the server data is used directly.
   - A redirect in the data file replaces the current navigation.
   - An error route in the data file renders the error page at that route, and other route data can still
     be used.
5. **Title and meta**: the title is updated after the page loads. Layout and page meta are merged into
   `<head>`.
6. **Page element**: when params change (for example `/blog/a` to `/blog/b`), the page element is
   recreated. It is reused when only the query changes or after a form submission reloads the page.
   - Element state, such as data from `@mounted()` or input values, belongs to the previous page. Reusing
     the element with new params would show the wrong content. The query is usually a filter or page
     number of the same page, and a form submission also stays on the same page, so keeping the state is
     useful.
   - Implementation: params select a different wrapper template, and lit doesn't reuse elements across
     different templates. The two templates differ (the second has an extra empty interpolation),
     because HMR in development treats identical templates as the same one. The server and hydration
     always use the first one, matching the SSR output.
7. **Get server element HTML**: after the page renders, new server and lazy elements get their HTML in
   this order:
   1. the current history entry cache, hit on back and forward
   2. `__elements.json`, when prerendered
   3. `POST /__gemkit_element`, elements in the same round share one request

   If a lazy element's code has already been loaded, it is a normal element and renders on the client
   without fetching HTML. After a lazy element gets its server content, the code loads by the `on` option
   as on the first load.
8. **Scroll**: scroll to the top, unless the URL has a hash, which is left to the anchor.

## Back and forward

The state of each history entry when leaving is cached in memory by key, keeping the latest 50 entries.
- **Cached content**: layout and page data, including first load data and client `load` results, and the
  HTML of server and lazy elements.
- **Back and forward**: use the cache directly, no prefetch and no request.
- **New navigation**: `push` and `replace` create new keys, so they never hit the cache.
- **After a form submission**: clear the whole cache. The submission may have changed the login state,
  so previous content can't be used.
- **Scroll position**: restore the position from when the entry was left. Wait for server element HTML
  to fill in first, otherwise the page is too short and the position is clipped.
  - Wait for the current task to finish first. Reused elements, such as a page element with only a query
    change, update in a microtask, and `MutationObserver` callbacks also run in microtasks. Only after
    that have all elements that need fetching started fetching.

The reason: going back means returning to the state you saw, not getting fresh data. Browser
back-forward caches work the same way, so no request means identical content and the best speed.

The first load server element HTML is in the DOM and not written to the cache, so going back to the first
page fetches those elements once more.

## Query and hash changes

- **Query change**: creates a new history entry and reloads the page data. The data file URL includes the
  query.
- **Hash only**: doesn't re-render routes or load data.

## Form submission (`actions`)

- **With JS**: `submitAction` posts the form to `<page path>?/<name>`.
  - The form has `aria-busy` during the request.
  - After submission, clear prefetch results and the history cache, and layouts don't reuse data.
  - On success, re-render the current page and keep the scroll position, since it is the same entry.
  - On redirect, navigate to the target on the client.
  - On error, render the error page at the page position.
- **Without JS**: native form submission.
  - On success or redirect, respond `303` and redirect to the target or the current page.
  - On error, respond with the error page.

## Redirects and errors

| Source                   | Server rendering                                          | Client navigation                                                  |
| ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `handle` redirect        | Respond with the redirect                                 | Data or element response contains the location, replace navigation |
| `load` redirect          | Respond with the redirect and no content                  | Data file contains the location, replace navigation                |
| `error()` / `notFound()` | Error page at the failing route, response uses its status | Error page at the same position                                    |
| No matched route         | Error page with status 404                                | Error page                                                         |

On a static host, redirects are written as `<meta http-equiv="refresh">` pages and a `redirect` in the
data file.

## Switch language

Language links are normal `<a href>` links, switching language reloads the whole page.

The base path, language pack and all content change, so a reload is the simplest and most consistent
behavior, and it matches the server-rendered result.

## Content sources

Look from top to bottom and stop at the first hit.

**Layout and page data (`loadData`)**
1. Data of an already rendered layout: layouts only, when params didn't change and no form was submitted.
2. The current history entry cache: hit on back and forward.
3. Data output in the page: on first load hydration.
4. Prefetched `__data.json`.
5. Request `__data.json`.

**Server and lazy element HTML (`loadServerElement`)**
1. The current history entry cache: hit on back and forward.
2. `__elements.json`: requested when prerendering, may be prefetched.
3. `POST /__gemkit_element`.

## Trade-offs

- **Layout `load` runs again on the server**: when navigating below the same layout, `__data.json` still
  contains layout data and the server runs the layout `load` again. A data file must be prerenderable as
  a static file, so its content can't depend on client state.
- **Two `handle` calls for dynamically rendered pages**: on client navigation, `__data.json` and
  `POST /__gemkit_element` are two requests, each runs `handle`.
- **Empty request with prerendering**: when prerendering is enabled, non-prerendered pages also request
  `__elements.json`, receive `{}` and then `POST`. The client doesn't know which pages were prerendered.

## Related

- [Pages](./002-pages.md) for `load` and `paths`.
- [Server elements](./008-server-elements.md) for `@server()`, `@lazy()` and `@client()`.
- [Request](./007-request.md) for `handle`, cookies and prerendering.
