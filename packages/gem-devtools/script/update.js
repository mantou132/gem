const pkg = require('../public/manifest.json');
pkg.version = require('../package.json').version;
require('fs').writeFileSync('./public/manifest.json', JSON.stringify(pkg, null, 2));
