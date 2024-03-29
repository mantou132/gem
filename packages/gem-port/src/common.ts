import path from 'path';
import { readdirSync, readFileSync, statSync } from 'fs';

import { ElementDetail, getElements } from 'gem-analyzer';
import { Project } from 'ts-morph';
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

const elementCache: Record<string, ElementDetail[] | undefined> = {};
const project = new Project({ useInMemoryFileSystem: true });
export function getFileElements(elementFilePath: string) {
  return (
    elementCache[elementFilePath] ||
    (elementCache[elementFilePath] = getElements(
      project.createSourceFile(elementFilePath, readFileSync(elementFilePath, { encoding: 'utf-8' })),
    ))
  );
}

export function getComponentName(tag: string) {
  return tag.replace(/(^|-)(\w)/g, (_, __, $1: string) => $1.toUpperCase());
}

export function getJsDocDescName(name: string, deprecated?: boolean) {
  return `${deprecated ? '/**@deprecated */\n' : ''}${name}`;
}

export function getRelativePath(elementFilePath: string, outDir: string) {
  const basename = path.basename(elementFilePath, path.extname(elementFilePath));
  // FIXME
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
