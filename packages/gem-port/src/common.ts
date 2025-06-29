import { promises, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import type { ElementDetail } from 'gem-analyzer';
import { getElements } from 'gem-analyzer';
import { ts as morphTs, Project } from 'ts-morph';
import * as ts from 'typescript';

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
    properties: chain.flatMap((e) => e.properties),
    methods: chain.flatMap((e) => e.methods),
    events: chain.flatMap((e) => e.events),
  };
};

const elementCache: Record<string, ElementDetail[] | undefined> = {};
const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: { target: morphTs.ScriptTarget.ESNext },
});
project.getFileSystem().readFile = (filePath) => promises.readFile(filePath, 'utf8');
export async function getFileElements(elementFilePath: string) {
  if (!elementCache[elementFilePath]) {
    const text = readFileSync(elementFilePath, { encoding: 'utf-8' });
    const file = project.getSourceFile(elementFilePath) || project.createSourceFile(elementFilePath, text);
    const details = await getElements(file, project);
    elementCache[elementFilePath] = details.map((detail) => mergeElementDetail(detail));
  }
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

export function compile(outDir: string, fileSystem: Record<string, string>): void {
  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2020,
    declaration: true,
    outDir,
  };
  const host = ts.createCompilerHost(options);
  const originReadFile = host.readFile;
  host.readFile = (filename: string) => {
    if (filename in fileSystem) return fileSystem[filename];
    return originReadFile(filename);
  };
  const program = ts.createProgram(Object.keys(fileSystem), options, host);
  program.emit().diagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      console.warn(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.warn(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  });
}
