#!/usr/bin/env node

import path from 'path';

import program from 'commander';

import { name, description, version } from '../package.json';

import { compileReact } from './react';
import { generateVue } from './vue';
import { compileSvelte } from './svelte';

const cliOptions = {
  outDir: './',
  svelteNs: '',
};

program
  .name(name)
  .description(description)
  .version(version, '-v, --version')
  .option('-o, --outdir <path>', `specify out dir`, (outdir: string) => (cliOptions.outDir = outdir))
  .option('--svelte-ns <ns>', `specify svelte element namespace`, (ns: string) => (cliOptions.svelteNs = ns))
  .arguments('<dir>')
  .action((dir: string) => {
    compileReact(dir, path.resolve(cliOptions.outDir, 'react'));
    generateVue(dir, path.resolve(cliOptions.outDir, 'vue'));
    compileSvelte(dir, path.resolve(cliOptions.outDir, 'svelte'), cliOptions.svelteNs);
    process.exit(0);
  });

program.parse(process.argv).outputHelp();
