#!/usr/bin/env node
import { Command } from 'commander';

import { start } from '../dist/node.js';
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
  .option('-p, --port <port>', 'server port, defaults to $PORT or 3000')
  .option('--host <host>', 'server host, defaults to $HOST or all addresses')
  .option('--no-compress', "don't compress dynamic responses, e.g. behind a CDN that compresses")
  .action(({ port, host, compress }) => start({ port: port ? Number(port) : undefined, host, compress }));

program.parse();
