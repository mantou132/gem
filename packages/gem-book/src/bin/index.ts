#!/usr/bin/env node

/**
 * Automatically generate configuration from directory
 *
 * @example
 * gem-book -c gem-book.cli.json src/docs
 * gem-book -t documentTitle src/docs
 */

import path from 'path';
import fs from 'fs';

import program from 'commander';
import mkdirp from 'mkdirp';
import getRepoInfo from 'git-repo-info';
import { debounce } from 'lodash';

import { version } from '../../package.json';
import { BookConfig, CliConfig, CliUniqueConfig, NavItem, SidebarConfig } from '../common/config';
import { DEFAULT_FILE, DEFAULT_CLI_FILE, DEFAULT_SOURCE_BRANCH } from '../common/constant';
import { isIndexFile, parseFilename } from '../common/utils';

import {
  getGithubUrl,
  getBaseDir,
  isDirConfigFile,
  getMetadata,
  isMdfile,
  isSomeContent,
  inspectObject,
  getRepoTitle,
  checkRelativeLink,
  readDirConfig,
  getIconDataUrl,
} from './utils';
import { startBuilder } from './builder';
import lang from './lang.json'; // https://developers.google.com/search/docs/advanced/crawling/localized-versions#language-codes

program.version(version, '-v, --version');

let docsRootDir = '';
let useConfig = false;
const bookConfig: Partial<BookConfig> = {};
const cliConfig: Required<CliUniqueConfig> = {
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
};

function readConfig(configPath: string) {
  const obj = require(path.resolve(process.cwd(), configPath)) as Partial<CliConfig & BookConfig>;
  useConfig = true;
  Object.keys(cliConfig).forEach((key: keyof CliUniqueConfig) => {
    if (key in obj) {
      const value = obj[key];
      delete obj[key];

      const cliConfigValue = cliConfig[key];

      // Overriding command line options is not allowed
      if (Array.isArray(cliConfigValue)) {
        cliConfigValue.splice(cliConfigValue.length, 0, ...(value as any[]));
      } else if (!cliConfigValue) {
        Object.assign(cliConfig, { [key]: value });
      }
    }
  });
  Object.assign(bookConfig, obj);
}

function readDir(dir: string, link = '/') {
  const result: NavItem[] = [];
  const filenames = fs.readdirSync(dir);
  const filenameWithoutRankNumberList = filenames.map((filename) => {
    const { title } = parseFilename(filename);
    return title;
  });
  if (!bookConfig.displayRank && new Set(filenameWithoutRankNumberList).size !== filenames.length) {
    throw new Error('After removing the rank number, duplicate file names are found, use `--display-rank`');
  }
  const config = readDirConfig(dir);
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
      const item: NavItem = { title: '', link: '' };
      const fullPath = path.join(dir, filename);
      if (fs.statSync(fullPath).isFile()) {
        if (isMdfile(fullPath)) {
          if (cliConfig.debug) {
            checkRelativeLink(fullPath, docsRootDir);
          }
          item.type = 'file';
          item.link = `${link}${filename}`;
          const {
            title,
            headings: children,
            isNav,
            navTitle,
            sidebarIgnore,
            hero,
            features,
          } = getMetadata(fullPath, bookConfig.displayRank);
          Object.assign(item, { title, children, isNav, navTitle, sidebarIgnore, hero, features });
          result.push(item);
        }
      } else {
        item.type = 'dir';
        item.link = `${link}${filename}/`;
        item.children = readDir(fullPath, path.posix.join(link, filename) + '/');
        const { title, isNav, navTitle, sidebarIgnore } = getMetadata(fullPath, false);
        Object.assign(item, { title, isNav, navTitle, sidebarIgnore });
        result.push(item);
      }
    });
  return result;
}

async function generateBookConfig(dir: string) {
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

  // create file
  const configPath = path.resolve(cliConfig.output || dir, cliConfig.output.endsWith('.json') ? '' : DEFAULT_FILE);
  const configStr = JSON.stringify(bookConfig, null, 2) + '\n';
  // buildMode: embeds the configuration into front-end resources
  if (!(!cliConfig.json && cliConfig.build)) {
    if (!isSomeContent(configPath, configStr)) {
      mkdirp.sync(path.dirname(configPath));
      // Trigger rename event
      fs.writeFileSync(configPath, configStr);
    }
  }
  console.log('Updated!');
}

const debounceCommand = debounce(generateBookConfig, 300);

program
  .option('-t, --title <title>', 'document title', (title: string) => {
    bookConfig.title = title;
  })
  .option('-i, --icon <path>', 'project icon path or url', (path: string) => {
    cliConfig.icon = path;
  })
  .option(
    '-o, --output <path>',
    `output file or directory, default use docs dir, generate an \`${DEFAULT_FILE}\` file if only JSON is generated`,
    (dir: string) => {
      cliConfig.output = dir;
    },
  )
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
  .option('--i18n', 'enabled i18n', () => {
    cliConfig.i18n = true;
  })
  .option('--display-rank', 'sorting number is not displayed in the link', () => {
    bookConfig.displayRank = true;
  })
  .option('--home-mode', 'use homepage mode', () => {
    bookConfig.homeMode = true;
  })
  .option('--nav <title,link>', 'attach a nav item', (item: string) => {
    bookConfig.nav ||= [];
    const [title, link] = item.split(',');
    if (!link) throw new Error('nav options error');
    bookConfig.nav.push({ title, link });
  })
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
  .option('--build', `output all front-end assets or \`${DEFAULT_FILE}\``, () => {
    cliConfig.build = true;
  })
  .option('--json', `only output \`${DEFAULT_FILE}\``, () => {
    cliConfig.json = true;
  })
  .option('--debug', 'enabled debug mode', () => {
    cliConfig.debug = true;
  })
  .option('--config <path>', `specify config file, default use \`${DEFAULT_CLI_FILE}\``, (configPath: string) => {
    readConfig(configPath);
  })
  .arguments('<dir>')
  .action(async (dir: string) => {
    if (!useConfig) {
      try {
        readConfig(DEFAULT_CLI_FILE);
      } catch {
        //
      }
    }

    docsRootDir = path.resolve(process.cwd(), dir);
    await generateBookConfig(dir);
    if (!cliConfig.build) {
      fs.watch(dir, { recursive: true }, (type, filePath) => {
        if (type === 'rename' || isDirConfigFile(filePath) || isMdfile(filePath)) {
          debounceCommand(dir);
        }
      });
    }
    if (!cliConfig.json) {
      if (cliConfig.debug) inspectObject(cliConfig);
      startBuilder(dir, cliConfig, bookConfig);
    }
  });

program.parse(process.argv);
