module.exports = {
  sourceDir: 'extension',
  artifactsDir: 'build',
  verbose: true,
  run: {
    firefox: 'nightly',
    startUrl: ['about:debugging', 'https://gemjs.org/'],
  },
  build: {
    overwriteDest: true,
  },
};
