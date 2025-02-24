#!/usr/bin/env node

import path from 'path';
import { readdirSync, statSync, writeFileSync } from 'fs';

import program from 'commander';
import getRepoInfo from 'git-repo-info';
import chalk from 'chalk';
import anymatch from 'anymatch';
import { sync } from 'mkdirp';
import { watch } from 'chokidar';
import express, { static as serveStatic } from 'express';

import { version } from '../../package.json';
import type { BookConfig, CliConfig, CliUniqueConfig, NavItem, SidebarConfig } from '../common/config';
import {
  DEFAULT_FILE,
  DEFAULT_CLI_FILE,
  DEFAULT_SOURCE_BRANCH,
  UPDATE_EVENT,
  DEFAULT_OUTPUT,
  DEFAULT_DOCS_DIR,
  GBP_PROTOCOL,
} from '../common/constant';
import { isIndexFile, parseFilename, debounce } from '../common/utils';
import type { FrontMatter } from '../common/frontmatter';

import {
  getGithubUrl,
  getBaseDir,
  isDirConfigFile,
  getMetadata,
  isMdFile,
  print,
  getRepoTitle,
  checkRelativeLink,
  readDirConfig,
  getIconDataUrl,
  getLatestMdFile,
  resolveTheme,
  importObject,
  resolveModule,
  getMdFile,
  isGithubOrGitLabNav,
} from './utils';
import { buildApp } from './builder';
import lang from './lang.json'; // https://developers.google.com/search/docs/advanced/crawling/localized-versions#language-codes

const devServerEventTarget = new EventTarget();

let bookConfig: BookConfig = {
  version: Date.now().toString(),
};

// 代表 cli options，不能被 config 覆盖，所以除了数组字段，不要设置初始值
let cliConfig: Required<CliUniqueConfig> = {
  icon: '',
  output: '',
  i18n: false,
  fallbackLanguage: '',
  plugin: [],
  ga: '',
  template: '',
  theme: '',
  build: false,
  site: '',
  ignored: ['**/node_modules/**'],
  json: false,
  debug: false,
  port: 0,
  config: '',
};

// 将配置文件和 cli options 合并，并将 book 选项同步到 bookConfig
async function syncConfig(fullPath?: string) {
  const obj: CliConfig = (await importObject(fullPath)) || {};
  Object.keys(cliConfig).forEach((k) => {
    const key = k as keyof CliUniqueConfig;
    if (key in obj) {
      const value = obj[key];
      delete obj[key];

      const cliConfigValue = cliConfig[key];

      if (Array.isArray(cliConfigValue)) {
        Object.assign(cliConfig, { [key]: [...new Set([...cliConfigValue, ...(value as any[])])] });
      } else if (!cliConfigValue) {
        Object.assign(cliConfig, { [key]: value });
      }
    }
  });

  // 初始化 cliConfig
  cliConfig.output ||= DEFAULT_OUTPUT;
  cliConfig.port ||= 8091;

  if (cliConfig.debug) print(cliConfig);

  if (obj.nav) {
    obj.nav = obj.nav?.filter((e) => {
      if (isGithubOrGitLabNav(e.title)) {
        bookConfig.github = e.link;
      } else {
        return true;
      }
    });
  }

  Object.assign(bookConfig, obj);
}

function readFiles(filenames: string[], docsRootDir: string, dir: string, link: string, config?: FrontMatter) {
  const result: NavItem[] = [];
  const getStat = (filename: string) => statSync(path.join(dir, filename));
  filenames
    .sort((filename1, filename2) => {
      const { rank: rank1, title: title1 } = parseFilename(filename1);
      const { rank: rank2, title: title2 } = parseFilename(filename2);
      if (isIndexFile(filename1)) return -1;

      const reverse = config?.reverse ? -1 : 1;
      if (rank1 && rank2) return (parseInt(rank1) - parseInt(rank2)) * reverse;

      // 文件夹排前面
      const isDir1 = getStat(filename1).isDirectory();
      const isDir2 = getStat(filename2).isDirectory();
      if (isDir1 && !isDir2) return -1 * reverse;
      if (!isDir1 && isDir2) return 1 * reverse;

      // 有编号的排前面
      if (rank1 && !rank2) return -1 * reverse;
      if (!rank1 && rank2) return 1 * reverse;

      return (title1 > title2 ? 1 : -1) * reverse;
    })
    .forEach((filename) => {
      const fullPath = path.join(dir, filename);
      if (anymatch(cliConfig.ignored, fullPath)) return;

      const stat = getStat(filename);
      if (stat.isFile()) {
        if (isMdFile(fullPath)) {
          if (cliConfig.debug) {
            checkRelativeLink(fullPath, docsRootDir);
          }
          const { title, isNav, navTitle, navOrder, sidebarIgnore, hero, features, redirect } = getMetadata(
            fullPath,
            bookConfig.displayRank,
          );
          const item: NavItem = {
            title,
            type: 'file',
            link: `${link}${filename}`,
            hash: getMdFile(fullPath).hash,
            isNav,
            navTitle,
            sidebarIgnore,
            navOrder,
            hero,
            features,
          };
          if (redirect) {
            (bookConfig.redirects ||= {})[item.link] = new URL(redirect, GBP_PROTOCOL + item.link).pathname;
          } else {
            result.push(item);
          }
        }
      }
      if (stat.isDirectory()) {
        const { title, isNav, navTitle, navOrder, sidebarIgnore, groups, redirect } = getMetadata(fullPath, false);
        const newDir = fullPath;
        const newLink = path.posix.join(link, filename) + '/';
        if (redirect) {
          const pattern = `${newLink}*`;
          const redirectPath = new URL(redirect, GBP_PROTOCOL + pattern).pathname;
          (bookConfig.redirects ||= {})[pattern] = `${redirectPath}${redirectPath.endsWith('/') ? ':0' : ''}`;
        } else {
          const subFilenameSet = new Set([...readdirSync(fullPath)]);
          result.push({
            type: 'dir',
            link: `${link}${filename}/`,
            title,
            children: groups?.map
              ? groups
                  .map(({ title: groupTitle, members }) => {
                    if (!members?.forEach) return [];
                    members.forEach((member) => subFilenameSet.delete(member));
                    const children = readFiles(members, docsRootDir, newDir, newLink, config);
                    if (!groupTitle) return children;
                    return {
                      type: 'dir',
                      link: `${link}${filename}/`,
                      title: groupTitle,
                      children,
                    } as NavItem;
                  })
                  .flat()
                  .concat(readFiles([...subFilenameSet], docsRootDir, newDir, newLink, config))
              : readDir(docsRootDir, newDir, newLink),
            isNav,
            navTitle,
            navOrder,
            sidebarIgnore,
          });
        }
      }
    });
  return result;
}

function readDir(docsRootDir: string, dir: string, link: string) {
  const filenames = readdirSync(dir);
  const filenameWithoutRankNumberList = filenames.map((filename) => {
    const { title } = parseFilename(filename);
    return title;
  });
  if (!bookConfig.displayRank && new Set(filenameWithoutRankNumberList).size !== filenames.length) {
    throw new Error('After removing the rank number, duplicate file names are found, use `--display-rank`');
  }
  return readFiles(filenames, docsRootDir, dir, link, readDirConfig(dir));
}

async function generateBookConfig(dir: string) {
  const docsRootDir = path.resolve(process.cwd(), dir);
  const t = Date.now();
  //icon path
  if (cliConfig.icon) {
    bookConfig.icon ??= await getIconDataUrl(cliConfig.icon);
  }

  // read github info
  bookConfig.github ??= await getGithubUrl();

  // read repository directory
  bookConfig.base ??= await getBaseDir();

  // default title
  bookConfig.title ??= getRepoTitle();

  // default sourceDir
  bookConfig.sourceDir ??= dir;

  // default sourceBranch
  // CI not support
  bookConfig.sourceBranch ??= getRepoInfo().branch || DEFAULT_SOURCE_BRANCH;

  if (cliConfig.i18n) {
    const sidebarConfig: SidebarConfig = {};
    readdirSync(docsRootDir).forEach((code) => {
      const fullPath = path.join(docsRootDir, code);
      if (statSync(fullPath).isDirectory()) {
        if (code in lang) {
          sidebarConfig[code] = {
            data: readDir(docsRootDir, path.join(docsRootDir, code), '/'),
            name: lang[code as keyof typeof lang],
          };
        } else {
          print(chalk.yellow(`Not support lang: ${code}`));
        }
      }
    });
    bookConfig.sidebar = sidebarConfig;
  } else {
    // recursive scan dir
    // fill sidebar
    bookConfig.sidebar = readDir(docsRootDir, docsRootDir, '/');
  }

  if (cliConfig.json) {
    const jsonPath = path.resolve(cliConfig.output || dir, cliConfig.output.endsWith('.json') ? '' : DEFAULT_FILE);
    sync(path.dirname(jsonPath));
    writeFileSync(jsonPath, JSON.stringify(bookConfig, null, 2) + '\n');
  }

  if (cliConfig.debug) print(bookConfig);
  print(chalk.green(`[${new Date().toISOString()}]: book config updated! ${Date.now() - t}ms`));
}

const updateBookConfig = debounce(async (dir: string) => {
  await generateBookConfig(dir);
  devServerEventTarget.dispatchEvent(
    Object.assign(new Event(UPDATE_EVENT), {
      detail: { config: bookConfig },
    }),
  );
});

const watchTheme = () => {
  const themePath = resolveTheme(cliConfig.theme);
  if (themePath) {
    return watch(themePath).on('change', async () => {
      devServerEventTarget.dispatchEvent(
        Object.assign(new Event(UPDATE_EVENT), {
          detail: { theme: await importObject(themePath) },
        }),
      );
    });
  }
};

const startBuild = async (dir: string) => {
  const devServer = await buildApp(dir, cliConfig, bookConfig);
  if (!devServer) return;

  await devServer.start();
  devServer.webSocketServer?.implementation.on('connection', (client) => {
    devServer.sendMessage([client], UPDATE_EVENT, { config: bookConfig });
  });
  return devServer;
};

const handleAction = async (dir = DEFAULT_DOCS_DIR) => {
  const initCliOptions = structuredClone(cliConfig);
  const initBookConfig = structuredClone(bookConfig);
  const docsRootDir = path.resolve(process.cwd(), dir);

  const configPath = resolveModule(cliConfig.config || DEFAULT_CLI_FILE, { silent: !cliConfig.config });
  if (cliConfig.config && !configPath) process.exit(1);

  await syncConfig(configPath);
  await generateBookConfig(dir);

  let devServer = cliConfig.json ? undefined : await startBuild(dir);

  if (!cliConfig.build) {
    devServerEventTarget.addEventListener(UPDATE_EVENT, (evt) => {
      devServer?.sendMessage(devServer.webSocketServer?.clients || [], UPDATE_EVENT, (evt as CustomEvent).detail);
    });

    // start server

    let themeWatcher = watchTheme();
    if (configPath) {
      watch(configPath).on('change', async () => {
        cliConfig = structuredClone(initCliOptions);
        bookConfig = structuredClone(initBookConfig);
        await syncConfig(configPath);
        await generateBookConfig(dir);
        await devServer?.stop();
        devServer = await startBuild(dir);
        await themeWatcher?.close();
        themeWatcher = watchTheme();
      });
    }

    watch(dir, {
      ignoreInitial: true,
      ignored: cliConfig.ignored || undefined,
    }).on('all', (type, filePathWithDir) => {
      if (type !== 'change') {
        return updateBookConfig(dir);
      }

      const filePath = path.relative(dir, filePathWithDir);
      const fullPath = path.join(docsRootDir, filePath);

      if (!isDirConfigFile(filePath) && !isMdFile(filePath)) {
        devServerEventTarget.dispatchEvent(
          Object.assign(new Event(UPDATE_EVENT), {
            detail: { reload: true },
          }),
        );
        return;
      }

      if (isDirConfigFile(filePath)) {
        return updateBookConfig(dir);
      }

      if (cliConfig.debug) {
        checkRelativeLink(fullPath, docsRootDir);
      }

      const { content, metadataChanged } = getLatestMdFile(fullPath, bookConfig.displayRank);
      devServerEventTarget.dispatchEvent(
        Object.assign(new Event(UPDATE_EVENT), {
          detail: { filePath: filePath.replaceAll('\\', '/'), content },
        }),
      );

      if (metadataChanged) {
        updateBookConfig(dir);
      }
    });
  }
};

program.version(version, '-v, --version');

program
  .option('-t, --title <title>', 'document title', (title) => {
    bookConfig.title = title;
  })
  .option('-d, --source-dir <dir>', 'github source dir, default use docs dir', (sourceDir) => {
    bookConfig.sourceDir = sourceDir;
  })
  .option(
    '-b, --source-branch <branch>',
    `github source branch, default \`${DEFAULT_SOURCE_BRANCH}\``,
    (sourceBranch) => {
      bookConfig.sourceBranch = sourceBranch;
    },
  )
  .option('--base <dir>', 'github base dir', (base) => {
    bookConfig.base = base;
  })
  .option('--github <url>', 'project github url', (link) => {
    bookConfig.github = link;
  })
  .option('--footer <string>', 'footer content, support markdown format', (footer) => {
    bookConfig.footer = footer;
  })
  .option('--display-rank', 'sorting number is not displayed in the link', () => {
    bookConfig.displayRank = true;
  })
  .option('--home-mode', 'use homepage mode', () => {
    bookConfig.homeMode = true;
  })
  .option('--only-file', 'not include heading navigation', () => {
    bookConfig.onlyFile = true;
  })
  .option('--nav <title,link>', 'attach a nav item', (item) => {
    bookConfig.nav ||= [];
    const [title, link] = item.split(',');
    if (!link) {
      print(chalk.red('nav options error'));
      process.exit(1);
    }
    if (isGithubOrGitLabNav(title)) {
      bookConfig.github = link;
    } else {
      bookConfig.nav.push({ title, link });
    }
  })
  .option('-i, --icon <path>', 'project icon path or url', (iconPath) => {
    cliConfig.icon = iconPath;
  })
  .option(
    '-o, --output <path>',
    `output file or directory, default use docs dir, generate an \`${DEFAULT_FILE}\` file if only JSON is generated`,
    (dir) => {
      cliConfig.output = dir;
      if (path.extname(dir) === '.json') {
        cliConfig.json = true;
      }
    },
  )
  .option('--plugin <name or path>', 'load plugin', (name) => {
    cliConfig.plugin.push(name);
  })
  .option('--ignored <string>', 'ignore file or dir', (str) => {
    cliConfig.ignored.push(str);
  })
  .option('--ga <id>', 'google analytics ID', (id) => {
    cliConfig.ga = id;
  })
  .option('--template <path>', 'html template path', (templatePath) => {
    cliConfig.template = templatePath;
  })
  .option('--theme <name or path>', 'theme path', (themePath) => {
    cliConfig.theme = themePath;
  })
  .option('--build', `output all front-end assets`, () => {
    cliConfig.build = true;
  })
  .option('--site <url>', `output \`sitemap.xml\``, (url) => {
    cliConfig.site = url;
  })
  .option('--i18n', 'enabled i18n', () => {
    cliConfig.i18n = true;
  })
  .option('--json', `only output \`${DEFAULT_FILE}\``, () => {
    cliConfig.json = true;
  })
  .option('--debug', 'enabled debug mode', () => {
    cliConfig.debug = true;
  })
  .option('--port <port>', 'serve port', (port: string) => {
    cliConfig.port = Number(port);
  })
  .option('--config <path>', `specify config file, default use \`${DEFAULT_CLI_FILE}\`.{js|json|mjs}`, (configPath) => {
    cliConfig.config = configPath;
  });

program
  .command('dev [dir]', { isDefault: true })
  .description('start a local dev server with instant hot updates')
  .action(handleAction);

program
  .command('build [dir]')
  .description('output all front-end assets, equal `--build`')
  .action((dir = DEFAULT_DOCS_DIR) => {
    cliConfig.build = true;
    handleAction(dir);
  });

program
  .command('serve [dir]')
  .description('build the docs and start static file server')
  .action(async (dir = DEFAULT_DOCS_DIR) => {
    cliConfig.build = true;
    await handleAction(dir);

    express()
      .use('/', serveStatic(path.resolve(cliConfig.output || dir), { immutable: true }))
      .get('*', (_, res) => res.sendFile(path.resolve(cliConfig.output || dir, 'index.html')))
      .listen(cliConfig.port, () => {
        print(chalk.green(`Project is running at:`) + `http://localhost:${cliConfig.port}`);
      });
  });

program.parse(process.argv);
