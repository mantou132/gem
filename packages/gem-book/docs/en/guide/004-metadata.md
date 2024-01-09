# Document metadata

GemBook allows adding data in `yaml` format (called `FrontMatter`) at the beginning of the Markdown file,
to set how documents appear in the sidebar and navigation bar. For example:

```md
---
title: Sidebar title
sidebarIgnore: true

isNav: true
navTitle: Navigation bar title
navOrder: 2

redirect: ./new.md
---

# Markdown title
```

> [!WARNING]
> Modifying `redirect` in development mode requires restarting the service to take effect.

## Homepage {#home}

The [homepage](./003-cli.md#--home-mode) also supports `hero` and `features`, for example:

<gbp-raw src="docs/en/README.md" range="1-17"></gbp-raw>

## Folder {#dir}

The settings for Markdown also apply to folders, just add `config.yml` in the folder, for example:

<gbp-raw src="docs/zh/guide/config.yml"></gbp-raw>

Two special options are supported:

- `reverse`: Reverse [sort](./001-sort.md), which is useful when blogging
- `groups`: Place multiple files within a group in the sidebar without modifying the directory structure

## Definition

<gbp-raw src="src/common/frontmatter.ts"></gbp-raw>
