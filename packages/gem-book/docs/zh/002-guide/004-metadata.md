# 文档元数据

允许在 Markdown 的开头添加 `yaml` 格式的元数据，允许你指定链接在侧边栏和导航栏中的显示方式。例如：

```md
---
title: 侧边栏标题
isNav: true
navTitle: 导航栏标题
navOrder: 2 # 导航栏位置
sidebarIgnore: true
---

# Markdown 标题
```

## 首页

[首页](./003-cli.md#--home-mode)还支持 `hero` `features`，例如：

<gbp-raw src="docs/zh/README.md" range="1-19"></gbp-raw>

## 重定向

如果文档移动或者重命名，可以使用重定向防止链接失效：

```md
---
redirect: ./new.md
---
```

> [!WARNING]
> 不支持为文件夹指定重定向

## 文件夹配置 {#dir}

文件夹有时候也需要指定名称（例如[多语言情况下的标题](./002-i18n.md)）和在侧边栏/导航栏中的显示方式，可以在该文件夹中添加 `config.yml` 来完成，例如：

<gbp-raw src="docs/zh/002-guide/config.yml"></gbp-raw>

支持两个特殊的选项：

- `reverse`：反向[排序](./001-sort.md)，这在写博客时很有用
- `groups`：在不修改目录结构的情况下在侧边栏中将多个文件放在一个组内

## 完整定义

<gbp-raw src="src/common/frontmatter.ts"></gbp-raw>
