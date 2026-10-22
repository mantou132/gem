import fs from 'node:fs';
import path from 'node:path';

import { camelToKebabCase, kebabToCamelCase } from '@mantou/gem/lib/utils';
import { Analyzer, type ElementDetail, type ExportDetail } from 'gem-analyzer';

import { applyImportMap, PROJECT_DIR } from './common.server';

let analyzer: Analyzer | undefined;

// 父类可能从包中导入，例如 `@mantou/tap-ui/elements/button`，使用 `importMap` 找到源码
function resolveModule(specifier: string) {
  const src = applyImportMap(specifier);
  if (src === specifier) return;
  const file = path.join(PROJECT_DIR, `${src}.ts`);
  return fs.existsSync(file) ? file : undefined;
}

// 同一个文件的多个 `<gbp-api>` 只分析一次，文件修改后重新分析
const cache = new Map<string, { mtime: number; result: ReturnType<Analyzer['analyze']> }>();

function analyze(file: string) {
  const { mtimeMs } = fs.statSync(file);
  const cached = cache.get(file);
  if (cached?.mtime === mtimeMs) return cached.result;
  analyzer ??= new Analyzer({ cwd: PROJECT_DIR, resolveModule });
  const result = analyzer.analyze(file);
  cache.set(file, { mtime: mtimeMs, result });
  return result;
}

const renderCode = (s = '', deprecated?: boolean, prefix?: string) => {
  if (!s) return '';
  const code = `\`${[prefix, s].filter(Boolean).join(' ').replace(/\|/g, '\\|').replace(/\n/g, ' ')}\``;
  return deprecated ? `~~${code}~~` : code;
};

const renderDescription = ({ description = '' }: { description?: string }) => description.replaceAll('\n', '<br>');

/** 没有描述时不显示描述列 */
function renderTable<T>(list: T[], headers: string[], fields: ((data: T) => string)[]) {
  const hasDescription = list.some((item) => (item as { description?: string }).description);
  const allHeaders = hasDescription ? [...headers, 'Description'] : headers;
  const allFields = hasDescription ? [...fields, renderDescription as (data: T) => string] : fields;
  return [
    `|${allHeaders.map((header) => ` ${header} |`).join('')}`,
    `|${allHeaders.map(() => ' --- |').join('')}`,
    ...list.map((item) => `|${allFields.map((field) => ` ${field(item)} |`).join('')}`),
    '',
  ].join('\n');
}

/** 将元素的 API 转换成 Markdown，`headingLevel` 是标题的起始级别 */
function renderElement(detail: ElementDetail, headingLevel: number, root = detail): string {
  const { constructorName, constructorExtendsName, constructorParams, extend } = detail;
  const { staticProperties, staticMethods, properties, methods, events, cssStates, parts, slots } = detail;

  // 有父类时，以类名作为标题，父类的内容在其下
  const renderHeader = (text: string) => {
    const level = '#'.repeat(headingLevel + (root.extend ? 1 : 0));
    const title = root.extend ? `\`${constructorName}\` ${text}` : text;
    // 和旧版本的锚点保持一致
    const hash = [constructorName, text]
      .map((e) => camelToKebabCase(kebabToCamelCase(e).replaceAll(' ', '')).replace('-', ''))
      .filter(Boolean)
      .join('-');
    return `${level} ${title} {#${hash}}\n\n`;
  };

  let text = '';
  if (root.extend)
    text += `${'#'.repeat(headingLevel)} ${constructorName} {#${camelToKebabCase(constructorName).replace('-', '')}}\n\n`;
  text += `${detail.description || ''}\n\n`;
  if (constructorExtendsName) {
    text += `${detail.shadow ? 'Shadow DOM; ' : ''}Extends ${renderCode(constructorExtendsName)}\n\n`;
  }
  if (constructorName && constructorParams.length) {
    text += renderHeader(`Constructor \`${constructorName}()\``);
    text += renderTable(
      constructorParams,
      ['Params', 'Type'],
      [({ name }) => renderCode(name), ({ type }) => renderCode(type)],
    );
  }
  if (staticProperties.length) {
    text += renderHeader('Static Properties');
    text += renderTable(
      staticProperties,
      ['Property', 'Type'],
      [
        ({ name, deprecated, getter, setter }) => renderCode(name, deprecated, getter ? 'get' : setter ? 'set' : ''),
        ({ type }) => renderCode(type),
      ],
    );
  }
  if (staticMethods.length) {
    text += renderHeader('Static Methods');
    text += renderTable(
      staticMethods,
      ['Method', 'Type'],
      [({ name, deprecated }) => renderCode(name, deprecated), ({ type }) => renderCode(type)],
    );
  }
  const instanceProperties = properties.filter(
    ({ slot, cssState, part, isRef }) => !slot && !cssState && !part && !isRef,
  );
  if (instanceProperties.length) {
    text += renderHeader('Instance Properties');
    text += renderTable(
      instanceProperties,
      ['Property(Attribute)', 'Reactive', 'Type'],
      [
        ({ name, attribute, deprecated, setter, getter }) =>
          renderCode(name, deprecated, getter ? 'get' : setter ? 'set' : '') +
          (attribute ? `(${renderCode(attribute, deprecated)})` : ''),
        ({ reactive }) => (reactive ? 'Yes' : ''),
        ({ type }) => renderCode(type),
      ],
    );
  }
  const instanceMethods = methods.filter(({ event }) => !event);
  if (instanceMethods.length) {
    text += renderHeader('Instance Methods');
    text += renderTable(
      instanceMethods,
      ['Method', 'Type'],
      [({ name, deprecated }) => renderCode(name, deprecated), ({ type }) => renderCode(type)],
    );
  }
  const others = [
    { type: 'Event', value: events },
    { type: 'Slot', value: slots },
    { type: 'Part', value: parts },
    { type: 'CSS State', value: cssStates },
  ].filter(({ value }) => value.length);
  if (others.length) {
    text += renderHeader('Other');
    text += renderTable(
      others,
      ['Type', 'Value'],
      [({ type }) => type, ({ value }) => value.map((e) => renderCode(e)).join(', ')],
    );
  }
  if (extend) text += `${renderElement(extend, headingLevel, detail)}\n\n`;
  return text;
}

/** 导出的函数和类 */
const renderExports = (exports: ExportDetail[]) =>
  renderTable(
    exports.filter(({ kindName }) => kindName === 'FunctionDeclaration' || kindName === 'ClassDeclaration'),
    ['Name'],
    [({ name, deprecated }) => renderCode(name, deprecated)],
  );

/**
 * 分析文件中的 Gem 元素，生成 API 文档（Markdown），指定 `name` 时只生成该元素的文档，
 * 没有元素时生成导出的函数和类
 */
export function renderApi(file: string, { name = '', headingLevel = 3 }) {
  const { elements, exports } = analyze(file);
  const list = name ? elements.filter((element) => element.name === name) : elements;
  if (!list.length) return renderExports(exports);
  return list.map((detail) => renderElement(detail, headingLevel)).join('\n\n');
}
