#!/usr/bin/env node
import { Command } from 'commander';

import { start } from '../dist/serve.js';

const program = new Command('gemkit');

program
  .command('start')
  .description('start the production server, serves dist/')
  .option('-p, --port <port>', 'server port')
  .action(({ port }) => start({ port: port ? Number(port) : undefined }));

program.parse();
