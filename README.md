# Gem &middot; [![Build Status](https://travis-ci.org/mantou132/gem.svg?branch=master)](https://travis-ci.org/mantou132/gem)

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

- **Support back button:**
  Drop-down menus, drawer-style menus, and pop-up windows can be closed with the back button just like native apps, and can also perform similar confirmation actions before closing;

## Document

- [Guide](https://gem-docs.netlify.com/guide/)
- [API](https://gem-docs.netlify.com/api/)

## Related repo

- [create-gem-app](https://github.com/mantou132/create-gem-app)
- [gem-boilerplate](https://github.com/mantou132/gem-boilerplate)
- [gem-lib-boilerplate](https://github.com/mantou132/gem-lib-boilerplate)
- [gem-book](https://github.com/mantou132/gem-book)
- [gem-frame](https://github.com/mantou132/gem-frame)
- [gem-ui](https://github.com/mantou132/gem-ui)
- [gem-devtools](https://github.com/mantou132/gem-devtools)

## Contribution

Fork repo you are interested in, submit PR
