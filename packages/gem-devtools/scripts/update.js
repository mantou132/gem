const pkg = require('../src/manifest.json');
pkg.version = require('../package.json').version;
require('node:fs').writeFileSync('./src/manifest.json', JSON.stringify(pkg, null, 2));
