```bash
# Create docs
mkdir docs && echo '# Hello GemBook!' > docs/readme.md

# Write and preview, changes to documents reload the page
npx gem-book docs

# Specify title
npx gem-book docs -t MyApp

# Build the website into dist/web
npx gem-book build docs

```
