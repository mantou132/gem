import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { ElementDetail } from 'gem-analyzer';
import { Analyzer } from 'gem-analyzer';

const dev = process.env.MODE === 'dev';
const elements = process.env.ELEMENTS?.split(',');

export function getElementPathList(elementsDir: string) {
  const paths = readdirSync(elementsDir)
    .map((filename) => path.resolve(elementsDir, filename))
    .filter((elementFilePath, index) => {
      if (!statSync(elementFilePath).isFile()) return false;
      if (elements) {
        return elements?.some((ele) => elementFilePath.includes(ele));
      } else if (dev) {
        return index < 2;
      }
      return true;
    });
  if (dev) {
    console.log('Compile files:', paths);
  }
  return paths;
}

const getChain = (detail: ElementDetail) => {
  let root = detail;
  const result: ElementDetail[] = [root];
  while (root.extend) {
    root = root.extend;
    result.push(root);
  }
  return result;
};

const mergeElementDetail = (detail: ElementDetail): ElementDetail => {
  const chain = getChain(detail);
  return {
    ...detail,
    // 子类可能重新声明父类字段，保留子类的
    properties: [
      ...new Map(
        chain
          .flatMap((e) => e.properties)
          .reverse()
          .map((e) => [e.name, e]),
      ).values(),
    ],
    methods: [
      ...new Map(
        chain
          .flatMap((e) => e.methods)
          .reverse()
          .map((e) => [e.name, e]),
      ).values(),
    ],
    events: [...new Set(chain.flatMap((e) => e.events))],
  };
};

const elementCache: Record<string, ElementDetail[] | undefined> = {};
// 依赖中的声明文件没有装饰器，父类从依赖的源码中分析
const analyzer = new Analyzer({
  resolveModule: (specifier) => {
    if (specifier.startsWith('.')) return;
    const match = specifier.match(/^((?:@[^/]+\/)?[^/]+)\/(.+)$/);
    const files = [`${specifier}.ts`, ...(match ? [`${match[1]}/src/${match[2]}.ts`] : [])];
    return files.map((file) => path.resolve('node_modules', file)).find((file) => existsSync(file));
  },
});

export function getFileElements(elementFilePath: string) {
  elementCache[elementFilePath] ||= analyzer
    .analyze(elementFilePath)
    .elements.map((detail) => mergeElementDetail(detail));
  return elementCache[elementFilePath];
}

export function getComponentName(tag: string) {
  return tag.replace(/(^|-)(\w)/g, (_, __, $1: string) => $1.toUpperCase());
}

export function getJsDocDescName(name: string, deprecated?: boolean) {
  return `${deprecated ? '/**@deprecated */\n' : ''}${name}`;
}

export function getRelativePath(elementFilePath: string, outDir: string) {
  const basename = path.basename(elementFilePath, path.extname(elementFilePath));
  // FIXME: 这里暂时坚定的认为 src/elements 的输出目录是 elements
  const relativePath = path.relative(path.resolve(outDir), path.dirname(elementFilePath)).replace('src/', '');
  return `${relativePath}/${basename}`;
}

export function getComponentInfo(detail: ElementDetail) {
  const props = detail.properties.filter(({ getter, event }) => !getter && !event);
  const getters = detail.properties.filter(({ getter }) => getter).map(({ name }) => name);
  const methods = detail.methods.map(({ name }) => name);
  return {
    componentName: getComponentName(detail.name),
    // 非 Attribute 无法 SSR，需要组件在客户端设置
    properties: props.filter(({ attribute }) => !attribute).map(({ name }) => name),
    // 组件事件 prop 名称到事件名称
    events: Object.fromEntries(
      detail.properties.filter(({ event }) => event).map(({ event }) => [getEventProp(event!), event!]),
    ),
    getters,
    methods,
    members: [...methods, ...getters],
  };
}

export function getEventProp(event: string) {
  return `on${getComponentName(event)}`;
}

export function getPropsType({ constructorName, properties }: ElementDetail) {
  const members = properties
    .filter(({ getter, event }) => !getter && !event)
    .map(({ name, deprecated }) => `${getJsDocDescName(`'${name}'`, deprecated)}?: ${constructorName}['${name}'];`);
  return `{\n${members.join('\n')}\n}`;
}

export function getEventsType({ constructorName, properties }: ElementDetail, getKey = (event: string) => event) {
  const members = properties
    .filter(({ event }) => event)
    .map(
      ({ name, event, deprecated }) =>
        `${getJsDocDescName(`'${getKey(event!)}'`, deprecated)}: (event: CustomEvent<Required<Parameters<${constructorName}['${name}']>>[0]>) => void;`,
    );
  return `{\n${members.join('\n')}\n}`;
}

export function getExposeType({ constructorName }: ElementDetail, members: string[]) {
  return `Pick<${constructorName}, ${members.map((name) => `'${name}'`).join(' | ') || 'never'}>`;
}

export function toJs(value: unknown) {
  return JSON.stringify(value).replaceAll('"', "'");
}

interface GenerateOptions {
  /** 所有组件共享的运行时，输出到 `_runtime.js` */
  runtime: string;
  /** 元素文件对应的 `.js` 内容 */
  getJs: (details: ElementDetail[]) => string;
  /** 元素文件对应的 `.d.ts` 内容 */
  getDts: (details: ElementDetail[]) => string;
  /** 其他文件，例如 `.svelte` 组件 */
  getExtraFiles?: (details: ElementDetail[]) => Record<string, string>;
}

/**
 * 每个元素文件生成 `.js`（导入元素和组件）和 `.d.ts`（组件和元素类型声明）
 */
export async function generateComponents(
  elementsDir: string,
  outDir: string,
  ns: string,
  { runtime, getJs, getDts, getExtraFiles }: GenerateOptions,
) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.resolve(outDir, '_runtime.js'), runtime);
  await Promise.all(
    getElementPathList(elementsDir).map(async (elementFilePath) => {
      const details = getFileElements(elementFilePath);
      const relativePath = getRelativePath(elementFilePath, outDir);
      const filename = [ns, path.basename(relativePath)].filter((e) => !!e).join('-');
      const exportElement = `export * from '${relativePath}';\n`;
      writeFileSync(path.resolve(outDir, `${filename}.js`), [exportElement, getJs(details)].join('\n'));
      writeFileSync(
        path.resolve(outDir, `${filename}.d.ts`),
        [
          `import type { ${details.map((e) => e.constructorName).join(', ')} } from '${relativePath}';`,
          exportElement,
          getDts(details),
        ].join('\n'),
      );
      Object.entries(getExtraFiles?.(details) || {}).forEach(([name, content]) => {
        writeFileSync(path.resolve(outDir, name), content);
      });
    }),
  );
}
