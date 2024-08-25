import {
  getElementPathList,
  getFileElements,
  getComponentName,
  getRelativePath,
  compile,
  getJsDocDescName,
} from './common';

async function createReactSourceFile(elementFilePath: string, outDir: string) {
  const elementDetailList = await getFileElements(elementFilePath);
  return Object.fromEntries(
    elementDetailList.map(({ name: tag, constructorName, properties, methods }) => {
      const componentName = getComponentName(tag);
      const componentPropsName = `${componentName}Props`;
      const componentMethodsName = `${componentName}Methods`;
      const relativePath = getRelativePath(elementFilePath, outDir);
      return [
        componentName + '.tsx',
        `
          import React, { HTMLAttributes, RefAttributes } from 'react';
          import React, { ForwardRefExoticComponent, forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
          import { ${constructorName} } from '${relativePath}';
          export * from '${relativePath}';
        
          export type ${componentPropsName} = HTMLAttributes<HTMLDivElement> & RefAttributes<${constructorName}> & {
            ${properties
              .map(({ name, reactive, event, deprecated }) =>
                event
                  ? [
                      getJsDocDescName(`'on${event}'`, deprecated),
                      `(event: CustomEvent<Parameters<${constructorName}['${name}']>[0]>) => void`,
                    ].join('?:')
                  : reactive
                    ? [getJsDocDescName(name, deprecated), `${constructorName}['${name}']`].join('?:')
                    : '',
              )
              .join(';\n')}
          };
        
          declare global {
            namespace JSX {
              interface IntrinsicElements {
                '${tag}': ${componentPropsName};
              }
            }
          }

          export type ${componentMethodsName} = {
            ${methods
              .map(({ name, deprecated }) =>
                [getJsDocDescName(name, deprecated), `${constructorName}['${name}']`].join(': '),
              )
              .join(';\n')}
          }
        
          export const ${componentName}: ForwardRefExoticComponent<Omit<${componentPropsName}, "ref"> & RefAttributes<${componentMethodsName}>> = forwardRef<${componentMethodsName}, ${componentPropsName}>(function (props, ref): JSX.Element {
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

export async function compileReact(elementsDir: string, outDir: string) {
  const fileSystem: Record<string, string> = {};

  const processFile = async (elementFilePath: string) => {
    Object.assign(fileSystem, await createReactSourceFile(elementFilePath, outDir));
  };

  await Promise.all(getElementPathList(elementsDir).map(processFile));
  compile(outDir, fileSystem);
}
