# 文档排序

`<gem-book>` 渲染的侧边栏尽量和文档在 IDE 、编辑器中的排序保持一致，默认规则：

- `readme.md` 和 `index.md` 始终排在最前面
- 文件夹排在文件前面
- 按文件名 ASCII 编码升序

添加数字前缀可以进行自定义排序，这依然和 IDE 、编辑器中保持一致，例如 IDE 显示的文件结构如下：

```
src/docs/
├── guide
│   ├── README.md
│   └── installation.md
├── 300-faq.md
├── 400-about.md
└── README.md
```

输出的侧边栏：

```
• README

˅ Guide
│ README
│ Installation

• FAQ
• About
```

> [!TIP]
> 文件名中的数字序号可以预留一定空间，方便后续在文件之间插入文档。
> 使用 [`reverse`](./004-metadata.md#dir) 进行反向排序。
> 另外，在文档中使用链接时允许不带这些权重数字，但这样会失去 IDE 支持，所以不建议这么做。

默认情况下，这个数字不会显示在 URL 中，如果你的文件名本来就有相同格式的前缀，可以使用 [`--display-rank`](../002-cli.md#--display-rank) 选项显示它们。
