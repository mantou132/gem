#!/usr/bin/env node
import { parseArgs } from 'node:util';

import { start } from '../dist/serve.js';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { port: { type: 'string', short: 'p' } },
});

if (positionals[0] === 'start') {
  start({ port: values.port ? Number(values.port) : undefined });
} else {
  console.log('Usage: gemkit start [--port <port>]');
  process.exitCode = 1;
}
