# 更多设置

GemBook 允许在 Markdown 文件的开头添加 `yaml` 格式（称为 `FrontMatter`）的数据，
以设置文档在侧边栏和导航栏中的显示方式。例如：

```md
---
title: 侧边栏标题
sidebarIgnore: true # 不在侧边栏中显示

isNav: true # 显示到顶部导航栏
navTitle: 顶部导航栏标题
navOrder: 2 # 顶部导航栏位置

redirect: ./new.md # 如果文档移动或者重命名，可以使用重定向防止链接失效
---

# 标题
```

> [!WARNING]
> 在开发模式下修改 `redirect` 需要重启服务才能生效

<!-- 因为 config 在 WebSockets 建立之后更新的 -->

## 首页 {#home}

启用 [`--home-mode`](../002-cli.md#--home-mode) 时，GemBook 将文档根目录的 `index.md` 或者 `readme.md` 渲染成首页，
首页还支持 `hero` `features`，例如：

<gbp-raw src="docs/zh/README.md" range="1-17"></gbp-raw>

## 文件夹设置 {#dir}

对 Markdown 的设置同样适用于文件夹，只需在文件夹中添加 `config.yml` 即可，例如：

<gbp-raw src="docs/zh/guide/config.yml"></gbp-raw>

另外，文件夹还有两个特殊的设置：

- `reverse`：反向[排序](./001-sort.md)，这在写博客时很有用
- `groups`：在不修改目录结构的情况下在侧边栏中将多个文件放在一个组内

## 完整定义

<gbp-raw src="src/common/frontmatter.ts"></gbp-raw>
