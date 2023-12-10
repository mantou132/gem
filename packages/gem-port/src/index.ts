#!/usr/bin/env node

import path from 'path';

import program from 'commander';

import { name, description, version } from '../package.json';

import { compileReact } from './react';
import { generateVue } from './vue';
import { compileSvelte } from './svelte';

const cliOptions = {
  outDir: './',
};

program
  .name(name)
  .description(description)
  .version(version, '-v, --version')
  .option('-o, --outdir <path>', `specify out dir`, (outdir: string) => (cliOptions.outDir = outdir), cliOptions.outDir)
  .arguments('<dir>')
  .action((dir: string) => {
    compileReact(dir, path.resolve(cliOptions.outDir, 'react'));
    generateVue(dir, path.resolve(cliOptions.outDir, 'vue'));
    compileSvelte(dir, path.resolve(cliOptions.outDir, 'svelte'));
    process.exit(0);
  });

program.parse(process.argv).outputHelp();
