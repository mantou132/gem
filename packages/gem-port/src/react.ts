import {
  compile,
  getComponentName,
  getElementPathList,
  getFileElements,
  getJsDocDescName,
  getRelativePath,
} from './common';

async function createReactSourceFile(elementFilePath: string, outDir: string) {
  const elementDetailList = await getFileElements(elementFilePath);
  return Object.fromEntries(
    elementDetailList.map(({ name: tag, constructorName, properties, methods }) => {
      const componentName = getComponentName(tag);
      const componentPropsName = `${componentName}Props`;
      const componentExposeName = `${componentName}Expose`;
      const relativePath = getRelativePath(elementFilePath, outDir);
      const getters = properties.filter((e) => e.getter);
      const settableProperties = properties.filter((e) => !e.getter && !e.event);
      return [
        `${componentName}.tsx`,
        `
          import React, { HTMLAttributes, RefAttributes } from 'react';
          import React, { ForwardRefExoticComponent, forwardRef, useImperativeHandle, useRef, useLayoutEffect } from 'react';
          import { ${constructorName} } from '${relativePath}';
          export * from '${relativePath}';
        
          export type ${componentPropsName} = HTMLAttributes<HTMLDivElement> & RefAttributes<${constructorName}> & {
            ${properties
              .map(({ name, getter, event, deprecated }) =>
                event
                  ? [
                      getJsDocDescName(`'on${event}'`, deprecated),
                      `(event: CustomEvent<Parameters<${constructorName}['${name}']>[0]>) => void`,
                    ].join('?:')
                  : !getter
                    ? [getJsDocDescName(name, deprecated), `${constructorName}['${name}']`].join('?:')
                    : '',
              )
              .join(';\n')}
          };

          export type ${componentExposeName} = {
            ${[...methods, ...getters]
              .map(({ name, deprecated }) =>
                [getJsDocDescName(name, deprecated), `${constructorName}['${name}']`].join(': '),
              )
              .join(';\n')}
          }
        
          declare global {
            namespace JSX {
              interface IntrinsicElements {
                '${tag}': ${componentPropsName};
              }
            }
          }
        
          export const ${componentName}: ForwardRefExoticComponent<Omit<${componentPropsName}, "ref"> & RefAttributes<${componentExposeName}>> = forwardRef<${componentExposeName}, ${componentPropsName}>(function (props, ref): JSX.Element {
            const elementRef = useRef<${constructorName}>(null);
            useImperativeHandle(ref, () => {
              return {
                ${methods
                  .map(
                    ({ name }) => `
                      ${name}(...args) {
                        return elementRef.current!.${name}(...args)
                      },
                    `,
                  )
                  .join('')}
                  ${getters
                    .map(
                      ({ name }) => `
                        get ${name}() {
                          return elementRef.current!.${name}
                        },
                      `,
                    )
                    .join('')}
              };
            }, []);
            
            // React Bug?
            useLayoutEffect(() => {
              const element = elementRef.current!;
              ${JSON.stringify(settableProperties.map(({ name }) => name))}.map(name => {
                element[name] = props[name];
              })
            }, [])

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
