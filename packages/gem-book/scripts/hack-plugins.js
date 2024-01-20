/**
 * 用于 gem 内部项目
 */

const { writeFileSync, readFileSync } = require('fs');
const path = require('path');

writeFileSync(
  './node_modules/gbp-example-hack.ts',
  readFileSync(path.resolve(__dirname, '../src/plugins/example.ts'), { encoding: 'utf-8' }).replace(
    `const script = document.createElement('script');`,
    `
if (new URL(src).pathname.startsWith('/duoyun-ui/')) {
  res(import(\`../../duoyun-ui/src/elements/\${src.split('/').pop()}\`));
  return;
}
const script = document.createElement('script');`,
  ),
);

writeFileSync(
  './node_modules/gbp-api-hack.ts',
  readFileSync(path.resolve(__dirname, '../src/plugins/api.ts'), { encoding: 'utf-8' }).replace(
    `(await import(/* webpackIgnore: true */ gemAnalyzer)) as typeof import('gem-analyzer');`,
    `await import('gem-analyzer');`,
  ),
);
