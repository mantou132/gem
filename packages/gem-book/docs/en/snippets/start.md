```bash
# Create docs
mkdir docs && echo '# Hello GemBook!' > docs/readme.md

# Write and preview
gem-book docs

# Specify title
gem-book docs -t MyApp

# Specify logo
gem-book docs -t MyApp -i logo.png

# Render readme.md/index.md as the project homepage
gem-book docs -t MyApp -i logo.png --home-mode

# Build front-end resources
gem-book docs -t MyApp -i logo.png --home-mode --build

```
