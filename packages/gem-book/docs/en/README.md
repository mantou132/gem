---
hero:
  title: <gem-book>
  desc: Create your document website easily and quickly
  actions:
    - text: Getting Started
      link: ./002-guide/README.md
features:
  - title: Out of the box
    desc: Just run the command line to pack all front-end resources, so that all attention can be paid to document writing
  - title: Performance
    desc: No redundant dependencies, the entire application will run smoothly with streamlined code
  - title: Expandable
    desc: Can insert custom elements into existing websites; using custom elements can also customize display documents very conveniently
---

## Getting Started

```bash
# Install gem-book
npm i gem-book

# Create docs
mkdir docs && echo '# Hello <gem-book>!' > docs/readme.md

# Preview docs
npx gem-book docs

# Build
npx gem-book docs --build
```

## Feedback

Please visit [GitHub](https://github.com/mantou132/gem)
