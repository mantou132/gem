# 文档排序

命令行工具默认按照文件名升序进行目录遍历，生成的配置文件中侧边栏的链接也按照该规则排序，`README.md` 始终排在最前面。
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
├── <README.md 一级标题>
├── Guide
│   ├── <README.md 一级标题>
│   └── <installation.md 一级标题>
└── <about.me 一级标题>
```
