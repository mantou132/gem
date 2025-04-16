#!/usr/bin/env node

import path from 'path';

import program from 'commander';

import { description, name, version } from '../package.json';
import { compileReact } from './react';
import { compileSvelte } from './svelte';
import { generateVue } from './vue';

const cliOptions = {
  outDir: './',
  svelteNs: '',
};

const timer = setTimeout(() => program.outputHelp());

program
  .name(name)
  .description(description)
  .version(version, '-v, --version')
  .option('-o, --outdir <path>', `specify out dir`, (outdir: string) => (cliOptions.outDir = outdir))
  .option('--svelte-ns <ns>', `specify svelte element namespace`, (ns: string) => (cliOptions.svelteNs = ns))
  .arguments('<dir>')
  .action(async (dir: string) => {
    clearTimeout(timer);
    await compileReact(dir, path.resolve(cliOptions.outDir, 'react'));
    await generateVue(dir, path.resolve(cliOptions.outDir, 'vue'));
    await compileSvelte(dir, path.resolve(cliOptions.outDir, 'svelte'), cliOptions.svelteNs);
    process.exit(0);
  });

program.parse(process.argv);
