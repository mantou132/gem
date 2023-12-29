# Document sorting

By default, the command line tool performs directory traversal in ascending order of file names. The links in the sidebar of the generated configuration file are also sorted according to this rule, and `README.md` is always ranked first. You can add weight numbers to the directory name and file name to customize the sorting, for example:

```
src/docs/
├── 002-guide
│   ├── README.md
│   └── installation.md
├── 003-about.md
└── README.md
```

Output sidebar:

```
├── <README.md Level 1 heading>
├── Guide
│   ├── <README.md Level 1 heading>
│   └── <installation.md Level 1 heading>
└── <about.me Level 1 heading>
```

By default, this number will not be displayed in the URL. If your file name already has a prefix in the same format, you can use [`displayRank`](./003-cli.md#--display-rank) option to display them.
