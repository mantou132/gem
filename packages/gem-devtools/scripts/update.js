const pkg = require('../src/manifest.json');
pkg.version = require('../package.json').version;
require('fs').writeFileSync('./src/manifest.json', JSON.stringify(pkg, null, 2));
