import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import { getComponentName, getElementPathList, getFileElements, getJsDocDescName, getRelativePath } from './common';

/**
 * 只用 ts 声明，有两个问题：
 * 
 * - 事件类型不知道写
 * - attribute 和 prop 写法不同
interface DuoyunButtonHTMLAttributes extends HTMLAttributes {
  type?: string;
  color?: string;
  small?: boolean;
  disabled?: boolean;
  dropdown?: any;
  route?: any;
  params?: any;
  query?: any;
  icon?: any;
}

declare module '@vue/runtime-dom' {
  interface IntrinsicElementAttributes {
    'dy-button': DuoyunButtonHTMLAttributes
  }
}
 */

export async function generateVue(elementsDir: string, outDir: string) {
  mkdirSync(outDir, { recursive: true });

  const processFile = async (elementFilePath: string) => {
    const elements = await getFileElements(elementFilePath);
    elements.forEach(([{ name: tag, properties, constructorName, methods, events }]) => {
      const componentName = getComponentName(tag);
      const componentExposeName = `${componentName}Expose`;
      const relativePath = getRelativePath(elementFilePath, outDir);
      const settableProperties = properties.filter((e) => !e.getter && !e.event);
      const getters = properties.filter((e) => e.getter);
      writeFileSync(
        resolve(outDir, componentName + '.vue'),
        `
        <script setup lang="ts">
        import { ref, defineProps, defineEmits, defineExpose, onMounted } from 'vue'
        import { ${constructorName} } from '${relativePath}';
        
        const elementRef = ref<${constructorName}>();
        
        const props = defineProps<{
          ${settableProperties
            .map(({ name, deprecated }) =>
              [getJsDocDescName(name, deprecated), `${constructorName}['${name}']`].join('?: '),
            )
            .join(',\n')}
        }>();
        
        const emit = defineEmits<{
          ${properties
            .filter(({ event }) => !!event)
            .map(({ name, deprecated }) =>
              [
                getJsDocDescName(name, deprecated),
                `[event: CustomEvent<Parameters<${constructorName}['${name}']>[0]>]`,
              ].join(': '),
            )
            .join(',\n')}
        }>()

        type ${componentExposeName} = {
          ${[...methods, ...getters]
            .map(({ name, deprecated }) =>
              [getJsDocDescName(name, deprecated), `${constructorName}['${name}']`].join(': '),
            )
            .join(';\n')}
        }
        
        defineExpose<${componentExposeName}>({
          ${methods
            .map(
              ({ name }) => `
                ${name}(...args) {
                  return elementRef.value!.${name}(...args)
                },
              `,
            )
            .join('')}
          ${getters
            .map(
              ({ name }) => `
                get ${name}() {
                  return elementRef.value!.${name}
                },
              `,
            )
            .join('')}
        })
        
        </script>

        <script lang="ts">
        export * from '${relativePath}';
        export default {
          name: '${componentName}',
        };
        </script>
        
        <template>
          <${tag}
            ref="elementRef"
            ${settableProperties.map(({ name }) => `.${name}="props.${name}"`).join(' ')}
            ${events.map((event) => [`@${event}`, `"e => emit('${event}', e)"`].join('=')).join(' ')}>
            <slot />
          </${tag}>
        </template>
      `,
      );
    });
  };

  await Promise.all(getElementPathList(elementsDir).map(processFile));
}
