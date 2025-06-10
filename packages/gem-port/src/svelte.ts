import path from 'node:path';

import {
  compile,
  getComponentName,
  getElementPathList,
  getFileElements,
  getJsDocDescName,
  getRelativePath,
} from './common';

export async function compileSvelte(elementsDir: string, outDir: string, ns = '') {
  const fileSystem: Record<string, string> = {};

  const processFile = async (elementFilePath: string) => {
    const elementDetailList = await getFileElements(elementFilePath);
    Object.assign(
      fileSystem,
      Object.fromEntries(
        elementDetailList.map(({ name: tag, constructorName, properties }) => {
          const componentName = getComponentName(tag);
          const componentPropsName = `${componentName}Props`;
          const relativePath = getRelativePath(elementFilePath, outDir);
          const basename = path.basename(relativePath);
          return [
            `${[ns, basename].filter((e) => !!e).join('-')}.ts`,
            `
            import type { HTMLAttributes } from "svelte/elements";
            import { ${constructorName} } from '${relativePath}';
            export * from '${relativePath}';

            interface ${componentPropsName} extends HTMLAttributes<HTMLElement> {
              ${properties
                .map(({ name, getter, event, deprecated }) =>
                  event
                    ? [
                        getJsDocDescName(`'on:${event}'`, deprecated),
                        `(event: CustomEvent<Parameters<${constructorName}['${name}']>[0]>) => void`,
                      ].join('?:')
                    : !getter
                      ? [getJsDocDescName(name, deprecated), `${constructorName}['${name}']`].join('?:')
                      : '',
                )
                .join(';\n')}
            };

            declare module "svelte/elements" {
              interface SvelteHTMLElements {
                '${tag}': ${componentPropsName};
              }
            }
          `,
          ];
        }),
      ),
    );
  };

  await Promise.all(getElementPathList(elementsDir).map(processFile));
  compile(outDir, fileSystem);
}
