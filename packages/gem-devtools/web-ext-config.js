module.exports = {
  sourceDir: 'extension',
  artifactsDir: 'build',
  verbose: true,
  run: {
    devtools: false,
    firefox: 'firefox',
    startUrl: ['about:debugging', 'https://gemjs.org/'],
  },
  build: {
    overwriteDest: true,
  },
};
