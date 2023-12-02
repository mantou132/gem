module.exports = {
  sourceDir: 'extension',
  artifactsDir: 'build',
  verbose: true,
  run: {
    devtools: false,
    // run on chrome: web-ext run --target=chromium
    // https://github.com/mozilla/web-ext/issues/1862
    startUrl: ['about:debugging', 'https://gemjs.org/'],
  },
  build: {
    overwriteDest: true,
  },
};
