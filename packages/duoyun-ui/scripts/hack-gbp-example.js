const fs = require('fs');
const path = require('path');

fs.writeFileSync(
  './node_modules/gbp-example-hack.ts',
  fs.readFileSync(path.resolve(__dirname, '../../gem-book/src/plugins/example.ts'), { encoding: 'utf-8' }).replace(
    `const script = document.createElement('script');`,
    `
if (new URL(src).pathname.startsWith('/duoyun-ui/')) {
  res(import(\`../../duoyun-ui/src/elements/\${src.split('/').pop()}\`));
  return;
}
const script = document.createElement('script');`,
  ),
);
