# Document metadata

Allows to add metadata in `yaml` format at the beginning of Markdown, allowing you to specify how links are displayed in the sidebar and navigation bar. E.g:

```md
---
title: Sidebar title
isNav: true
navTitle: Navigation bar title
sidebarIgnore: true
---

# Markdown title
```

## Homepage

The [homepage](./003-cli.md#--home-mode) also supports `hero` and `features`, for example:

<gbp-raw src="docs/en/README.md" range="1-19"></gbp-raw>

You can also use `config.yml` to specify metadata for the folder.

## Redirect

Use redirects to prevent links from breaking if the document is moved or renamed:

```md
---
redirect: ./new.md
---
```

> [!WARNING]
> Specifying redirection for folders is not supported

## Folder

Folders sometimes need to specify a name (e.g: [i18n](./002-i18n.md)) and a display method in the sidebar/navigation bar. You can add `config.yml` to the folder, for example:

<gbp-raw src="docs/zh/002-guide/config.yml"></gbp-raw>

Two special options are supported:

- `reverse`: Reverse [sort](./001-sort.md), which is useful when blogging
- `groups`: Place multiple files within a group in the sidebar without modifying the directory structure

## Definition

<gbp-raw src="src/common/frontmatter.ts"></gbp-raw>
