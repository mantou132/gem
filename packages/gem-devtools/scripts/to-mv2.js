const pkg = require('../extension/manifest.json');

require('fs').writeFileSync('./extension/manifest.json', JSON.stringify({ ...pkg, manifest_version: 2 }, null, 2));
