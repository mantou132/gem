import * as ts from 'typescript';

import { getValidAttrType, getElementPathList, getFileElements, getComponentName, getRelativePath } from './common';

function createReactSourceFile(elementFilePath: string, outDir: string) {
  const elementDetailList = getFileElements(elementFilePath);
  return Object.fromEntries(
    elementDetailList.map(({ name: tag, constructorName, properties, methods, events }) => {
      const componentName = getComponentName(tag);
      const componentPropsName = `${componentName}Props`;
      const componentMethodsName = `${componentName}Methods`;
      return [
        componentName + '.tsx',
        `
          import React, { HTMLAttributes, RefAttributes } from 'react';
          import React, { ForwardRefExoticComponent, forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
          import { TemplateResult } from '@mantou/gem/lib/element';
          import { ${constructorName} } from '${getRelativePath(elementFilePath, outDir)}';
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
                [`'on${event}'`, `(arg: CustomEvent<any>) => any`].join('?:'),
              )
              .join(';')}
          };
        
          declare global {
            namespace JSX {
              interface IntrinsicElements {
                '${tag}': ${componentPropsName};
              }
            }
          }

          // 下面的以后可以删除，直接使用原生

          export type ${componentMethodsName} = {
            ${methods.map(({ name }) => [name, `typeof ${constructorName}.prototype.${name}`].join(': ')).join(';')}
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
            
            // React Bug
            const [mounted, update] = useState(false);
            useEffect(() => update(true), []);
            if (!mounted) {
              return <${tag}
                    ${properties
                      .map(({ attribute, name }) => (attribute ? `${attribute}={props.${name}}` : ''))
                      .join(' ')}
                    ></${tag}>;
            }
            
            return <${tag} ref={elementRef} {...props}></${tag}>;
          })

          export default ${componentName};
        `,
      ];
    }),
  );
}

function createReactSourceFiles(elementsDir: string, outDir: string) {
  const fileSystem: Record<string, string> = {};
  getElementPathList(elementsDir).forEach((elementFilePath) => {
    Object.assign(fileSystem, createReactSourceFile(elementFilePath, outDir));
  });
  return fileSystem;
}

export function compileReact(elementsDir: string, outDir: string): void {
  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2020,
    declaration: true,
    outDir,
  };
  const fileSystem = createReactSourceFiles(elementsDir, outDir);
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
