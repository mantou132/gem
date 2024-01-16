import {
  getElementPathList,
  getFileElements,
  getComponentName,
  getRelativePath,
  compile,
  getJsDocDescName,
} from './common';

function createReactSourceFile(elementFilePath: string, outDir: string) {
  const elementDetailList = getFileElements(elementFilePath);
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

export function compileReact(elementsDir: string, outDir: string): void {
  const fileSystem: Record<string, string> = {};
  getElementPathList(elementsDir).forEach((elementFilePath) => {
    Object.assign(fileSystem, createReactSourceFile(elementFilePath, outDir));
  });
  compile(outDir, fileSystem);
}
