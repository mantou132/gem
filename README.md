# Gem

Read in other languages: English | [中文](./README_zh.md)

Create custom elements, bind data, route switching, and quickly develop WebApps based on custom elements. Stripped from [mt-music-player](https://github.com/mantou132/mt-music-player).

## Features

- **Lightweight:**
  The whole librarie is divided into three modules (custom elements, global data management, routing), you can choose whether to use the built-in custom elements, all the content is packaged together and only 15kb(br compression).

- **Simple:**
  There is no new syntax, everything is HTML, CSS, JavaScript. There is no superfluous concept, only "Observe" is needed to create reactive custom elements;

- **High performance:**
  The template engine uses [lit-html](https://github.com/Polymer/lit-html), bundle size, performance of addition, deletion, modification, and memory usage are better than React and Vue, [here](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts-results/table.html) is the performance comparison between lit-html and React and Vue;

- **Asynchronous rendering:**
  which will avoid blocking the main thread for a long time when continuously rendering (such as creating a list) of element, providing a smooth user experience;

## Document

- [Guide](https://gemjs.org/guide/)
- [API](https://gemjs.org/api/)

## Project Packages

| Package                                         | Description                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| [gem](packages/gem)                             | Gem core                                                         |
| [gem-devtools](packages/gem-devtools)           | Browser debugging tool for Gem                                   |
| [gem-analyzer](packages/gem-analyzer)           | Gem element analyzer, which can automatically generate documents |
| [gem-book](packages/gem-book)                   | Documentation site builder created using Gem                     |
| [duoyun-ui](packages/duoyun-ui)                 | UI library created using Gem                                     |
| [gem-port](packages/gem-port)                   | Export Gem elements as React/Vue/Svelte components               |
| [gem-examples](packages/gem-examples)           | Gem and DuoyunUI examples                                        |
| [language-service](packages/language-service)   | language service for Gem                                         |
| [vscode-gem-plugin](packages/vscode-gem-plugin) | VSCode extension                                                 |
| [swc-plugin-gem](crates/swc-plugin-gem)         | Building plugin for [SWC](https://swc.rs/)                       |
| [zed-plugin-gem](crates/swc-plugin-gem)         | [Zed](https://zed.dev/) extension                                |

[Roadmap](https://mm.tt/app/map/3412316197?t=TGs84FRcwQ).

## Contribution

Fork repo, submit PR
