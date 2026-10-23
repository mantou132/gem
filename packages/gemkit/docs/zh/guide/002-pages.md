# 页面

页面是 `src/pages` 中的模块，默认导出是用 `@page` 标记的 Gem 元素。
Gemkit 生成标签名，按需加载模块，并把 `params` 和 `data` 传递给元素。

```ts
// src/pages/about.ts
@page('About')
export default class AboutPage extends GemElement {
  @template()
  #content = () => html`<h1>About</h1>`;
}
```

`@page` 接受一个标题字符串或者选项对象。

## 选项

| 选项    | 类型                             | 说明                                      |
| ------- | -------------------------------- | ----------------------------------------- |
| `title` | `string \| (ctx) => string`      | 页面标题，见[标题](#标题)。               |
| `load`  | `(ctx) => data \| Promise<data>` | 渲染前加载数据，见[加载数据](#加载数据)。 |
| `meta`  | `Meta \| (ctx) => Meta`          | 页面的 `<meta>`，见[Meta](#meta)。        |
| `paths` | `({ lang }) => Params[]`         | 需要预渲染的动态路由参数。                |

`title`、`load` 和 `meta` 的参数是 `{ params, data }`。`load` 的参数中 `data` 是同名 `*.server.ts`
的结果；`title` 和 `meta` 的参数中 `data` 是 `load` 的结果。

```ts
// src/pages/blog/[slug].ts
interface Post {
  slug: string;
  title: string;
  summary?: string;
  cover?: string;
}

@page<{ slug: string }, Post | undefined>({
  load: ({ params }) => getPost(params.slug),
  title: ({ data }) => data?.title || 'Not Found',
  meta: ({ data }) => ({ description: data?.summary, 'og:image': data?.cover }),
  paths: () => posts.map(({ slug }) => ({ slug })),
})
export default class PostPage extends GemElement {
  @property data?: Post;

  @template()
  #content = () => html`<h1>${this.data?.title}</h1>`;
}
```

第一个泛型参数是路由参数，第二个是 `data` 的类型。它们只用来提供类型，Gemkit 不会在运行时校验数据。

## 页面元素

生成的路由会把下面的属性传递给页面元素：

| 属性     | 说明                                              |
| -------- | ------------------------------------------------- |
| `params` | 匹配到的路由参数，例如 `{ slug: 'hello' }`。      |
| `data`   | `load` 的结果，或者同名服务端模块 `load` 的结果。 |

使用 `@property` 声明它们，属性改变时模板才会重新渲染：

```ts
@page<{ slug: string }, Post | undefined>({ load: ({ params }) => getPost(params.slug) })
export default class PostPage extends GemElement {
  @property params!: { slug: string };
  @property data?: Post;
}
```

参数改变时（例如从 `/blog/a` 导航到 `/blog/b`），页面元素会重新创建，页面中的元素和状态都属于上一个页面，
不会被复用。只有查询参数改变，或者提交表单后重新加载数据时，页面元素会被复用，并收到新的 `data`。

## 加载数据

`load` 在服务端渲染和客户端导航时都会执行。由于同一份代码会在两个环境中运行，只能使用同构的 API，
例如 `fetch` 和 `import()`。它的结果会被转换成 JSON 输出到页面中，所以必须是 JSON 值，
不能是类实例或者函数。

只能在服务端运行的代码放在同名的 `*.server.ts` 中，它的 `load` 结果作为 `data` 传给 `load`：

```ts
// src/pages/blog/[slug].ts
@page<{ slug: string }, { markdown: string }>({
  load: ({ data }) => parseMarkdown(data.markdown),
});
```

```ts
// src/pages/blog/[slug].server.ts
import { readFile } from 'node:fs/promises';

export async function load({ params }: { params: { slug: string } }) {
  return { markdown: await readFile(`content/${params.slug}.md`, 'utf8') };
}
```

没有提供 `load` 时，服务端模块 `load` 的结果直接作为 `data`。
- 首次请求时数据输出到 HTML 中，水合时不再请求。
- 客户端导航时请求 `<页面路径>/__data.json`。
- 预渲染时数据文件写在页面旁边。
- `load` 中跳转或者抛出 `error()` 时页面不会渲染，见[请求](./007-request.md)。

## 标题

页面 `load` 完成后设置页面标题，客户端导航时更新 `<title>`。固定标题使用字符串，
也可以根据 `params` 和 `data` 生成标题：

```ts
@page({ title: ({ data }) => data?.title || 'Untitled' })
```

网站标题和标题模板来自插件选项：

```ts
pluginGemkit({ title: 'My Site', titleTemplate: '%s | My Site' });
```

`%s` 会替换成页面标题。页面没有标题时使用网站标题。没有设置 `title` 的页面在客户端导航时不会改变标题。

## Meta

`meta` 返回一个对象，值是字符串或者 `undefined`。包含 `:` 的 key（例如 `og:image`）输出为
`<meta property>`，其他输出为 `<meta name>`，值为 `undefined` 时跳过。

```ts
@page({
  meta: ({ data }) => ({
    description: data?.summary,
    'og:image': data?.cover,
  }),
})
```

布局和页面的 meta 会合并，内层的路由覆盖同名的 key。根布局适合设置全站默认值。

服务端会把页面的 meta 追加到 `<head>` 中。客户端导航时 Gemkit 移除之前的页面 meta，再添加新的。
不要在 `src/index.html` 中重复相同的 `<meta>`，页面中的 meta 是追加的，不会替换它。

## 动态路径

动态路由没有固定的 URL 列表。要预渲染这些页面，就在 `paths` 中返回每个页面的参数，
可以放在页面选项中，也可以放在服务端模块中：

```ts
@page<{ slug: string }>({
  paths: () => posts.map(({ slug }) => ({ slug })),
});
```

```ts
// src/pages/blog/[slug].server.ts
export function paths() {
  return [{ slug: 'hello' }, { slug: 'world' }];
}
```

每种语言都会调用一次 `paths`，参数是 `{ lang }`，所以不同语言可以有不同数量的页面。
没有服务端模块的路由使用页面的 `paths` 选项即可。服务端模块的 `paths` 适合页面列表来自文件系统或者数据库的情况。

静态路由总是会预渲染。没有 `paths` 的动态路由在请求时渲染，运行时需要服务器；
也可以使用 [`prerender: false`](../reference/001-config.md#prerender) 关闭整个站点的预渲染。
