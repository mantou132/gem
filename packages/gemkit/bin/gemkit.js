#!/usr/bin/env node
import { Command } from 'commander';

import { start } from '../dist/serve.js';
import { init } from './init.js';

const program = new Command('gemkit');

program
  .command('init')
  .description('create an app in the directory, it must be empty or not exist')
  .argument('[dir]', 'project directory', '.')
  .action((dir) => init(dir));

program
  .command('start')
  .description('start the production server, serves dist/')
  .option('-p, --port <port>', 'server port')
  .action(({ port }) => start({ port: port ? Number(port) : undefined }));

program.parse();
