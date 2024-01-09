# Document sorting

The rendered sidebar of `<gem-book>` should be consistent with the sorting of documents in the IDE and editor. The default rules are:

- `readme.md` and `index.md` always come first
- Folders come before file
- Sort ascending by filename ASCII encoding

Adding a numerical prefix allows for custom sorting, which is still consistent with the IDE and editor, for example:

```
src/docs/
├── guide
│   ├── README.md
│   └── installation.md
├── 003-about.md
└── README.md
```

Output sidebar:

```
• README

˅ Guide
│ README
│ Installation

• About
```

> [!TIP]
> Use [`reverse`](./004-metadata.md#dir) to reverse sort.
> In addition, it is allowed to use links in documents without these weight numbers, but this will lose IDE support, so it is not recommended.

By default, this number will not be displayed in the URL. If your file name already has a prefix in the same format, you can use [`--display-rank`](./003-cli.md#--display-rank) option to display them.
