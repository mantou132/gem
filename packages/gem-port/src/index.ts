#!/usr/bin/env node

import path from 'node:path';

import { program } from 'commander';

import { description, name, version } from '../package.json';
import { generateReact } from './react';
import { generateSvelte } from './svelte';
import { generateVue } from './vue';

const cliOptions = {
  outDir: './',
  ns: '',
};

const timer = setTimeout(() => program.outputHelp());

program
  .name(name)
  .description(description)
  .version(version, '-v, --version')
  .option('-o, --outdir <path>', `specify out dir`, (outdir: string) => (cliOptions.outDir = outdir))
  .option('--ns <ns>', `specify output filename prefix`, (ns: string) => (cliOptions.ns = ns))
  .arguments('<dir>')
  .action(async (dir: string) => {
    clearTimeout(timer);
    await generateReact(dir, path.resolve(cliOptions.outDir, 'react'), cliOptions.ns);
    await generateVue(dir, path.resolve(cliOptions.outDir, 'vue'), cliOptions.ns);
    await generateSvelte(dir, path.resolve(cliOptions.outDir, 'svelte'), cliOptions.ns);
    process.exit(0);
  });

program.parse(process.argv);
