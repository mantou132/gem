---
hero:
  title: <gem-book>
  desc: 简单、快速创建你的文档网站
  actions:
    - text: 快速开始
      link: ./002-guide/README.md
features:
  - title: 开箱即用
    desc: 只需运行命令行就能打包所有前端资源，让所有注意力都能放在文档编写上
  - title: 高性能
    desc: 没有多余的依赖，整个应用将使用精简的代码流畅的运行
  - title: 可插拔可扩展
    desc: 能将自定义元素插入已有的网站中；使用自定义元素也能非常方便的自定义展示文档
---

## 轻松上手

```bash
# 安装 gem-book
npm i gem-book

# 创建文档
mkdir docs && echo '# Hello <gem-book>!' > docs/readme.md

# 预览文档
npx gem-book docs

# 构建前端资源
npx gem-book docs --build
```

## 反馈与共建

请访问 [GitHub](https://github.com/mantou132/gem)
