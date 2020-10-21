# Gem &middot; [![Build Status](https://travis-ci.org/mantou132/gem.svg?branch=master)](https://travis-ci.org/mantou132/gem)

使用其他语言阅读：[English](./README.md) | 简体中文

创建自定义元素, 绑定数据, 路由切换, 快速基于自定义元素开发 WebApp。
从 [mt-music-player](https://github.com/mantou132/mt-music-player) 中剥离出来。

## 特色

- **轻巧：**
  整个框架分为三个模块（自定义元素，全局数据管理，路由），
  内置的自定义元素可以自己选择是否使用，
  所有内容打包在一起也只有 40kb。

- **简单：**
  没有全新的语法，一切都是 HTML，CSS，JavaScript。
  没有多余的概念，只需要“Observe”就能创建反应式自定义元素；

- **高性能：**
  模版引擎使用 [lit-html](https://github.com/Polymer/lit-html)，
  打包文件大小，增删改查的性能以及内存占有都要优于 React，Vue，
  [这里](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts-results/table.html)是 lit-html 和 React，Vue 的性能比较；

- **异步渲染：**
  包含一个 `AsyncGemElement` 类，连续渲染（例如创建列表）该类元素时会避免长时间阻塞主线程，提供流畅的用户体验；

- **支持返回键：**
  下拉菜单，抽屉式菜单，弹窗能像原生 App 一样通过返回键关闭，并且还能在关闭前类似确认的动作；

## 文档

- [Guide](https://gem-docs.netlify.com/guide/)
- [API](https://gem-docs.netlify.com/API/)

## 相关项目

- [create-gem-app](https://github.com/mantou132/create-gem-app)
- [gem-boilerplate](https://github.com/mantou132/gem-boilerplate)
- [gem-lib-boilerplate](https://github.com/mantou132/gem-lib-boilerplate)
- [gem-book](https://github.com/mantou132/gem-book)
- [gem-frame](https://github.com/mantou132/gem-frame)
- [gem-ui](https://github.com/mantou132/gem-ui)
- [gem-devtools](https://github.com/mantou132/gem-devtools)

## 贡献

Fork 你感兴趣的项目，提交 PR
