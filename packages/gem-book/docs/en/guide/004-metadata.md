# Document metadata

GemBook allows adding data in `yaml` format (called `FrontMatter`) at the beginning of the Markdown file,
to set how documents appear in the sidebar and navigation bar. For example:

<!-- biome-ignore format: frontmatter in embedded md is not parsed -->

```md
---
title: Sidebar title
description: The description of the page, the first paragraph is used by default
sidebarIgnore: true

isNav: true
navTitle: Navigation bar title
navOrder: 2

redirect: ./new.md
---

# Markdown title
```

## Homepage {#home}

The homepage of [`homeMode`](../002-cli.md#homemode) also supports `hero` and `features`, for example:

<gbp-raw src="docs/en/README.md" range="1-17"></gbp-raw>

## Folder {#dir}

The settings for Markdown also apply to folders, just add `config.yml` in the folder, for example:

<gbp-raw src="docs/zh/guide/config.yml"></gbp-raw>

Two special options are supported:
- `reverse`: Reverse [sort](./001-sort.md), which is useful when blogging
- `groups`: Place multiple files within a group in the sidebar without modifying the directory structure, the files of a group without `title` are displayed directly

A folder with `isNav` is an independent part of the documents, it is only displayed in the navigation bar, when the current page is in it, the sidebar only displays the documents of the folder.

## Definition

<gbp-raw src="app/lib/frontmatter.ts"></gbp-raw>
