# 文档排序

命令行工具默认按照文件名升序进行目录遍历，生成的配置文件中侧边栏的链接也按照该规则排序，`README.md`/`index.md` 始终排在最前面。
可以在目录名称和文件名称中添加权重数字以自定义排序，例如：

```
src/docs/
├── 002-guide
│   ├── README.md
│   └── installation.md
├── 003-about.md
└── README.md
```

输出的侧边栏：

```
• README

˅ Guide
│ README
│ Installation

• About
```

> [!TIP]
> 用文件名进行排序的好处是你在 IDE 中看到的文档顺序基本就是网站侧边栏中的顺序，可以使用 [`reverse`](./004-metadata.md#dir) 进行降序显示侧边栏。
> 另外，在文档中使用链接时允许不带这些权重数字，但这样会失去 IDE 支持，所以不建议这么做。

默认情况下，这个数字不会显示在 URL 中，如果你的文件名本来就有相同格式的前缀，可以使用 [`--display-rank`](./003-cli.md#--display-rank) 选项显示它们。
