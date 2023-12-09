import path from 'path';
import { readdirSync, readFileSync, statSync } from 'fs';

import { ElementDetail, getElements } from 'gem-analyzer';
import { Project } from 'ts-morph';

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

const validAttrType = new Set(['string', 'number', 'boolean']);
export function getValidAttrType(type = '') {
  return validAttrType.has(type) ? type : 'string';
}

export function getComponentName(tag: string) {
  return tag.replace(/(^|-)(\w)/g, (_, __, $1: string) => $1.toUpperCase());
}

export function getRelativePath(elementFilePath: string, outDir: string) {
  const basename = path.basename(elementFilePath, path.extname(elementFilePath));
  // FIXME
  const relativePath = path.relative(path.resolve(outDir), path.dirname(elementFilePath)).replace('src/', '');
  return `${relativePath}/${basename}`;
}
