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

The homepage also supports `hero` and `features`, for example:

<gbp-raw src="docs/en/README.md" range="-19"></gbp-raw>

You can also use `config.yml` to specify metadata for the folder.

## Redirect

Use redirects to prevent links from breaking if the document is moved or renamed:

```md
---
redirect: ./new.md
---
```

## Definition

<gbp-raw src="src/common/frontmatter.ts"></gbp-raw>
