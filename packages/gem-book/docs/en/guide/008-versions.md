# Versioning

Keep the documents of old versions in the documents directory, the latest version stays where it is:

```
docs/
├── en/          # latest
│   └── guide/
├── zh/
└── v1/          # old version
    ├── en/
    │   └── guide/
    └── zh/
```

Without [internationalization](./002-i18n.md), put the documents of old versions in `docs/v1` directly.

Then list the old versions in the config file, newest first:

```json
{
  "versions": ["v2", "v1"]
}
```

- The pages of old versions are prefixed with the version, e.g. `/en/v1/guide`, the latest version keeps `/en/guide`
- A version selector is displayed in the navigation bar, it goes to the homepage of the version
- The pages of old versions display a notice linking to the same page of the latest version
- Old versions don't have to contain every language
- Search and [`llms.txt`](./006-deploy.md) only include the latest version
