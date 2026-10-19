#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { createRsbuild } from '@rsbuild/core';
import { Command } from 'commander';

import pkg from '../package.json' with { type: 'json' };
import type { GemBookConfig } from './config.ts';
import { pluginGemBook } from './plugin.ts';

interface Options {
  title?: string;
  i18n?: boolean;
  port?: string;
  config: string;
}

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

/** `package.json` 中的 `title`，否则使用目录名 */
function getDefaultTitle() {
  try {
    const { title } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (title) return title as string;
  } catch {}
  return path.basename(process.cwd()).replace(/^./, (c) => c.toUpperCase());
}

/** 仓库的 `origin` 地址，例如 `git@github.com:a/b.git` => `https://github.com/a/b` */
function getRemoteUrl() {
  const remote = git('remote', 'get-url', 'origin');
  if (!remote) return;
  return remote
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/\.git$/, '');
}

/** 内置主题（`themes` 目录）或者主题文件（JSON 或者默认导出主题的模块） */
async function importTheme(name?: string) {
  if (!name) return;
  if (name.endsWith('.json')) return JSON.parse(fs.readFileSync(name, 'utf8'));
  const builtIn = new URL(`../themes/${name}.js`, import.meta.url);
  const url = fs.existsSync(builtIn) ? builtIn : pathToFileURL(path.resolve(name));
  return (await import(url.href)).default;
}

async function run(command: 'dev' | 'build' | 'serve', docsDir: string, options: Options) {
  const config: GemBookConfig = fs.existsSync(options.config)
    ? JSON.parse(fs.readFileSync(options.config, 'utf8'))
    : {};
  const port = options.port || config.port;
  const rsbuild = await createRsbuild({
    config: {
      plugins: [
        pluginGemBook({
          ...config,
          docsDir,
          title: options.title || config.title || getDefaultTitle(),
          i18n: options.i18n ?? config.i18n,
          github: config.github || getRemoteUrl(),
          sourceBranch: config.sourceBranch || git('branch', '--show-current') || undefined,
          theme: await importTheme(config.theme),
        }),
      ],
      server: { port: port ? Number(port) : undefined },
    },
  });
  if (command === 'dev') {
    await rsbuild.startDevServer();
    return;
  }
  await rsbuild.build();
  if (command === 'serve') await rsbuild.preview();
}

const program = new Command('gem-book')
  .description(pkg.description)
  .version(pkg.version, '-v, --version')
  .option('-t, --title <title>', 'site title')
  .option('--i18n', 'documents are in language directories, e.g. docs/en, docs/zh')
  .option('--port <port>', 'dev server port')
  .option('--config <path>', 'config file', 'gem-book.cli.json');

// `gem-book docs` 等于 `gem-book dev docs`
program
  .command('dev', { isDefault: true })
  .description('start the dev server')
  .argument('[docs-dir]', 'documents directory', '.')
  .action((docsDir: string) => run('dev', docsDir, program.opts<Options>()));

program
  .command('build')
  .description('build and prerender the site into dist/')
  .argument('[docs-dir]', 'documents directory', '.')
  .action((docsDir: string) => run('build', docsDir, program.opts<Options>()));

program
  .command('serve')
  .description('build the site and serve dist/web')
  .argument('[docs-dir]', 'documents directory', '.')
  .action((docsDir: string) => run('serve', docsDir, program.opts<Options>()));

await program.parseAsync();
