---
isNav: true
navTitle: Guide
---

# Introduction

GemBook renders [Markdown](https://en.wikipedia.org/wiki/Markdown) content into a website and generates pages based on the directory structure.
GemBook is a document site generation tool created for [Gem](https://github.com/mantou132/gem), it is also written with Gem and built on [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit):
Markdown is rendered on the server, every page is prerendered into HTML when building, and the browser takes over the pages for client-side navigation.

## Getting Started

> [!WARNING]
> GemBook depends on [Node.js v22+](https://nodejs.org/), please ensure that the `node -v` command can be executed

<gbp-include src="../snippets/start.md"></gbp-include>

More [options](../002-cli.md).

## Goals

- Build Markdown content into a website with one command, without project configuration
- The content is visible before JavaScript loads, and can be deployed to any static hosting
- Extend Markdown with [custom elements](../003-plugins.md), such as runnable examples and API documentation
