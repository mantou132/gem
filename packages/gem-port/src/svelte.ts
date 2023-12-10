import path from 'path';

import { compile, getComponentName, getElementPathList, getFileElements, getRelativePath } from './common';

export function compileSvelte(elementsDir: string, outDir: string): void {
  const fileSystem: Record<string, string> = {};
  getElementPathList(elementsDir).forEach((elementFilePath) => {
    const elementDetailList = getFileElements(elementFilePath);
    Object.assign(
      fileSystem,
      Object.fromEntries(
        elementDetailList.map(({ name: tag, constructorName, properties }) => {
          const componentName = getComponentName(tag);
          const componentPropsName = `${componentName}Props`;
          const relativePath = getRelativePath(elementFilePath, outDir);
          const basename = path.basename(relativePath);
          return [
            basename + '.ts',
            `
            import type { HTMLAttributes } from "svelte/elements";
            import { ${constructorName} } from '${relativePath}';
            export * from '${relativePath}';

            interface ${componentPropsName} extends HTMLAttributes<HTMLElement> {
              ${properties
                .map(({ name, reactive, event }) =>
                  event
                    ? [
                        `'on:${event}'`,
                        `(event: CustomEvent<Parameters<${constructorName}['${name}']>[0]>) => void`,
                      ].join('?:')
                    : reactive
                    ? [name, `${constructorName}['${name}']`].join('?:')
                    : '',
                )
                .join(';')}
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
  });
  compile(outDir, fileSystem);
}
