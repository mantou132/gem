#!/usr/bin/env node

import path from 'path';
import { readdirSync, readFileSync, statSync } from 'fs';

import { getElements } from 'gem-analyzer';
import { Project } from 'ts-morph';
import * as ts from 'typescript';
import program from 'commander';

import { name, description, version } from '../package.json';

const cliOptions = {
  outDir: './',
};

const validAttrType = new Set(['string', 'number', 'boolean']);

function getValidAttrType(type = '') {
  return validAttrType.has(type) ? type : 'string';
}

function createReactSourceFile(elementFilePath: string, outDir: string) {
  const content = readFileSync(elementFilePath, { encoding: 'utf-8' });
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(elementFilePath, content);
  const basename = path.basename(elementFilePath, path.extname(elementFilePath));
  // FIXME
  const relativePath = path.relative(path.resolve(outDir), path.dirname(elementFilePath)).replace('src/', '');
  return Object.fromEntries(
    getElements(file).map(({ name: tag, constructorName, properties, methods, events }) => {
      const componentName = constructorName.replace('Element', '');
      const componentPropsName = `${componentName}Props`;
      const componentMethodsName = `${componentName}Methods`;
      return [
        componentName + '.tsx',
        `
          import React, { ForwardRefExoticComponent, HTMLAttributes, RefAttributes, forwardRef, useImperativeHandle, useRef } from 'react';
          import { TemplateResult } from '@mantou/gem/lib/element';
          import { ${constructorName} } from '${relativePath}/${basename}';
          export { ${constructorName} };
        
          export type ${componentPropsName} = HTMLAttributes<HTMLDivElement> & RefAttributes<${constructorName}> & {
            ${properties
              .map(({ name, attribute, reactive, type }) =>
                // TODO
                !reactive ? '' : [name, attribute ? getValidAttrType(type) : 'any'].join('?:'),
              )
              .join(';')}
            ${events
              .map((event) =>
                // TODO
                [`on${event}`, `(arg: CustomEvent<any>) => any`].join('?:'),
              )
              .join(';')}
          };

          export type ${componentMethodsName} = {
            ${methods.map(({ name }) => [name, `typeof ${constructorName}.prototype.${name}`].join(': ')).join(';')}
          }
        
          declare global {
            namespace JSX {
              interface IntrinsicElements {
                '${tag}': ${componentPropsName};
              }
            }
          }
        
          const ${componentName}: ForwardRefExoticComponent<Omit<${componentPropsName}, "ref"> & RefAttributes<${componentMethodsName}>> = forwardRef<${componentMethodsName}, ${componentPropsName}>(function (props, ref): JSX.Element {
            const elementRef = useRef<${constructorName}>(null);
            useImperativeHandle(ref, () => {
              return {
                ${methods
                  .map(
                    ({ name }) => `
                      ${name}(...args) {
                        elementRef.current?.${name}(...args)
                      }
                    `,
                  )
                  .join(',')}
              };
            }, []);
            return <${tag} ref={elementRef} {...props}></${tag}>;
          })

          export default ${componentName};
        `,
      ];
    }),
  );
}

function createSourceFiles(elementsDir: string, outDir: string) {
  const fileSystem: Record<string, string> = {};
  readdirSync(elementsDir).forEach((filename) => {
    const elementFilePath = path.resolve(elementsDir, filename);
    if (statSync(elementFilePath).isFile()) {
      // DEV
      // if (!elementFilePath.includes('button')) return;
      Object.assign(fileSystem, createReactSourceFile(elementFilePath, outDir));
    }
  });
  return fileSystem;
}

function compile(elementsDir: string): void {
  const outDir = path.resolve(cliOptions.outDir, 'react');
  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2020,
    declaration: true,
    outDir,
  };
  const fileSystem = createSourceFiles(elementsDir, outDir);
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

program
  .name(name)
  .description(description)
  .version(version, '-v, --version')
  .option('-o, --outdir <path>', `specify out dir`, (outdir: string) => (cliOptions.outDir = outdir), cliOptions.outDir)
  .arguments('<dir>')
  .action((dir: string) => {
    compile(dir);
    process.exit(0);
  });

program.parse(process.argv).outputHelp();
