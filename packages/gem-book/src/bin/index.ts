#!/usr/bin/env node

/**
 * @example
 * gem-book -c gem-book.cli.json docs
 * gem-book -t documentTitle docs
 */

import path from 'path';
import fs from 'fs';

import program from 'commander';
import mkdirp from 'mkdirp';
import getRepoInfo from 'git-repo-info';
import { throttle } from 'lodash';

import { version } from '../../package.json';
import { BookConfig, CliConfig, CliUniqueConfig, NavItem, SidebarConfig } from '../common/config';
import { DEFAULT_FILE, DEFAULT_CLI_FILE, DEFAULT_SOURCE_BRANCH, UPDATE_EVENT } from '../common/constant';
import { isIndexFile, parseFilename } from '../common/utils';
import { FrontMatter } from '../common/frontmatter';

import {
  getGithubUrl,
  getBaseDir,
  isDirConfigFile,
  getMetadata,
  isMdFile,
  isSomeContent,
  inspectObject,
  getRepoTitle,
  checkRelativeLink,
  readDirConfig,
  getIconDataUrl,
  getHash,
  getFile,
  resolveTheme,
  importObject,
  resolveModule,
} from './utils';
import { startBuilder } from './builder';
import lang from './lang.json'; // https://developers.google.com/search/docs/advanced/crawling/localized-versions#language-codes

const devServerEventTarget = new EventTarget();

program.version(version, '-v, --version');

let docsRootDir = '';
let bookConfig: BookConfig = {};
let cliConfig: Required<CliUniqueConfig> = {
  icon: '',
  output: '',
  i18n: false,
  plugin: [],
  ga: '',
  template: '',
  theme: '',
  build: false,
  json: false,
  debug: false,
  config: '',
};

// 将配置文件和 cli 选项合并，并将 book 选项同步到 bookConfig
async function syncConfig(fullPath?: string) {
  const obj: CliConfig = (await importObject(resolveModule(fullPath))) || {};
  Object.keys(cliConfig).forEach((key: keyof CliUniqueConfig) => {
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

  if (cliConfig.debug) inspectObject(cliConfig);

  obj.nav = obj.nav?.filter((e) => {
    if (e.title?.toLowerCase() === 'github') {
      bookConfig.github = e.link;
    } else {
      return true;
    }
  });
  Object.assign(bookConfig, obj);
}

function readFiles(filenames: string[], dir: string, link: string, config?: FrontMatter) {
  const result: NavItem[] = [];

  filenames
    .sort((filename1, filename2) => {
      const { rank: rank1 } = parseFilename(filename1);
      const { rank: rank2 } = parseFilename(filename2);
      const reverse = config?.reverse ? -1 : 1;
      if (isIndexFile(filename1)) return -1;
      if (parseInt(rank1) > parseInt(rank2) || !rank2) return 1 * reverse;
      return -1 * reverse;
    })
    .forEach((filename) => {
      const fullPath = path.join(dir, filename);
      if (fs.statSync(fullPath).isFile()) {
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
            hash: getHash(fullPath),
            isNav,
            navTitle,
            sidebarIgnore,
            navOrder,
            hero,
            features,
          };
          if (redirect) {
            bookConfig.redirects = Object.assign(bookConfig.redirects || {}, {
              [item.link]: new URL(redirect, `file:${item.link}`).pathname,
            });
          } else {
            result.push(item);
          }
        }
      } else {
        const { title, isNav, navTitle, navOrder, sidebarIgnore, groups } = getMetadata(fullPath, false);
        const newDir = fullPath;
        const newLink = path.join(link, filename) + '/';
        const subFilenameSet = new Set([...fs.readdirSync(fullPath)]);
        result.push({
          type: 'dir',
          link: `${link}${filename}/`,
          title,
          children: groups?.map
            ? groups
                .map(({ title, members }) => {
                  if (!members?.forEach) return [];
                  members.forEach((filename) => subFilenameSet.delete(filename));
                  const children = readFiles(members, newDir, newLink, config);
                  if (!title) return children;
                  return {
                    type: 'dir',
                    link: `${link}${filename}/`,
                    title,
                    children,
                  } as NavItem;
                })
                .flat()
                .concat(readFiles([...subFilenameSet], newDir, newLink, config))
            : readDir(newDir, newLink),
          isNav,
          navTitle,
          navOrder,
          sidebarIgnore,
        });
      }
    });
  return result;
}

function readDir(dir: string, link = '/') {
  const filenames = fs.readdirSync(dir);
  const filenameWithoutRankNumberList = filenames.map((filename) => {
    const { title } = parseFilename(filename);
    return title;
  });
  if (!bookConfig.displayRank && new Set(filenameWithoutRankNumberList).size !== filenames.length) {
    throw new Error('After removing the rank number, duplicate file names are found, use `--display-rank`');
  }
  return readFiles(filenames, dir, link, readDirConfig(dir));
}

async function generateBookConfig(dir: string) {
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
    fs.readdirSync(docsRootDir).forEach((code) => {
      const fullPath = path.join(docsRootDir, code);
      if (fs.statSync(fullPath).isDirectory()) {
        if (code in lang) {
          sidebarConfig[code] = {
            data: readDir(path.join(docsRootDir, code)),
            name: lang[code as keyof typeof lang],
          };
        }
      }
    });
    bookConfig.sidebar = sidebarConfig;
  } else {
    // recursive scan dir
    // fill sidebar
    bookConfig.sidebar = readDir(docsRootDir);
  }

  if (cliConfig.json) {
    const configPath = path.resolve(cliConfig.output || dir, cliConfig.output.endsWith('.json') ? '' : DEFAULT_FILE);
    const configStr = JSON.stringify(bookConfig, null, 2) + '\n';
    if (!isSomeContent(configPath, configStr)) {
      mkdirp.sync(path.dirname(configPath));
      // Trigger rename event
      fs.writeFileSync(configPath, configStr);
    }
  }

  if (cliConfig.debug) inspectObject(bookConfig, 2);
  // eslint-disable-next-line no-console
  console.log(`${new Date().toISOString()} book config updated! ${Date.now() - t}ms`);
}

program
  .option('-t, --title <title>', 'document title', (title: string) => {
    bookConfig.title = title;
  })
  .option('-d, --source-dir <dir>', 'github source dir, default use docs dir', (sourceDir: string) => {
    bookConfig.sourceDir = sourceDir;
  })
  .option(
    '-b, --source-branch <branch>',
    `github source branch, default \`${DEFAULT_SOURCE_BRANCH}\``,
    (sourceBranch: string) => {
      bookConfig.sourceBranch = sourceBranch;
    },
  )
  .option('--base <dir>', 'github base dir', (base: string) => {
    bookConfig.base = base;
  })
  .option('--github <url>', 'project github url', (link: string) => {
    bookConfig.github = link;
  })
  .option('--footer <string>', 'footer content, support markdown format', (footer: string) => {
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
  .option('--nav <title,link>', 'attach a nav item', (item: string) => {
    bookConfig.nav ||= [];
    const [title, link] = item.split(',');
    if (!link) throw new Error('nav options error');
    if (title.toLowerCase() === 'github') {
      bookConfig.github = link;
    } else {
      bookConfig.nav.push({ title, link });
    }
  })
  .option('-i, --icon <path>', 'project icon path or url', (path: string) => {
    cliConfig.icon = path;
  })
  .option(
    '-o, --output <path>',
    `output file or directory, default use docs dir, generate an \`${DEFAULT_FILE}\` file if only JSON is generated`,
    (dir: string) => {
      cliConfig.output = dir;
      if (path.extname(dir) === '.json') {
        cliConfig.json = true;
      }
    },
  )
  .option('--plugin <name or path>', 'load plugin', (name: string) => {
    cliConfig.plugin.push(name);
  })
  .option('--ga <id>', 'google analytics ID', (id: string) => {
    cliConfig.ga = id;
  })
  .option('--template <path>', 'html template path', (path) => {
    cliConfig.template = path;
  })
  .option('--theme <name or path>', 'theme path', (path) => {
    cliConfig.theme = path;
  })
  .option('--build', `output all front-end assets`, () => {
    cliConfig.build = true;
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
  .option(
    '--config <path>',
    `specify config file, default use \`${DEFAULT_CLI_FILE}\`.{js|json|mjs}`,
    (configPath: string) => {
      cliConfig.config = configPath;
    },
  )
  .arguments('<dir>')
  .action(async (dir: string) => {
    const initCliOptions = structuredClone(cliConfig);
    const initBookConfig = structuredClone(bookConfig);

    docsRootDir = path.resolve(process.cwd(), dir);

    const configPath = resolveModule(cliConfig.config || DEFAULT_CLI_FILE);
    await syncConfig(configPath);
    await generateBookConfig(dir);

    const updateBookConfig = throttle(
      async () => {
        await generateBookConfig(dir);
        devServerEventTarget.dispatchEvent(
          Object.assign(new Event(UPDATE_EVENT), {
            detail: { config: bookConfig },
          }),
        );
      },
      100,
      { trailing: true },
    );

    const watchTheme = () => {
      const themePath = resolveTheme(cliConfig.theme);
      if (themePath) {
        return fs.watch(
          themePath,
          throttle(
            async () => {
              devServerEventTarget.dispatchEvent(
                Object.assign(new Event(UPDATE_EVENT), {
                  detail: { theme: await importObject(themePath) },
                }),
              );
            },
            100,
            { trailing: true },
          ),
        );
      }
    };

    let server = cliConfig.json ? undefined : await startBuilder(dir, cliConfig, bookConfig);

    if (!cliConfig.build) {
      devServerEventTarget.addEventListener(UPDATE_EVENT, ({ detail }: CustomEvent<string>) => {
        server?.sendMessage(server.webSocketServer?.clients || [], UPDATE_EVENT, detail);
      });

      let themeWatcher = watchTheme();
      if (configPath) {
        fs.watch(
          configPath,
          throttle(
            async () => {
              cliConfig = structuredClone(initCliOptions);
              bookConfig = structuredClone(initBookConfig);
              await syncConfig(configPath);
              await generateBookConfig(dir);
              await server?.stop();
              server = await startBuilder(dir, cliConfig, bookConfig);
              devServerEventTarget.dispatchEvent(
                Object.assign(new Event(UPDATE_EVENT), {
                  detail: { config: bookConfig },
                }),
              );
              themeWatcher?.close();
              themeWatcher = watchTheme();
            },
            300,
            { trailing: true },
          ),
        );
      }

      fs.watch(dir, { recursive: true }, async (type, filePath) => {
        if (filePath && !isDirConfigFile(filePath) && !isMdFile(filePath)) {
          devServerEventTarget.dispatchEvent(
            Object.assign(new Event(UPDATE_EVENT), {
              detail: { reload: true },
            }),
          );
        }

        if (type === 'rename' || !filePath || isDirConfigFile(filePath)) {
          return updateBookConfig();
        }

        const { content, metadataChanged } = getFile(path.resolve(dir, filePath), bookConfig.displayRank);
        // hot reload
        // https://nodejs.org/api/events.html#class-customevent
        devServerEventTarget.dispatchEvent(
          Object.assign(new Event(UPDATE_EVENT), {
            detail: { filePath, content },
          }),
        );

        if (metadataChanged) {
          updateBookConfig();
        }
      });
    }
  });

program.parse(process.argv);
