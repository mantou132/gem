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
    elements.forEach(({ name: tag, properties, constructorName, methods, events }) => {
      const componentName = getComponentName(tag);
      const componentMethodsName = `${componentName}Methods`;
      const relativePath = getRelativePath(elementFilePath, outDir);
      const reactiveProps = properties.filter(({ reactive }) => !!reactive);
      writeFileSync(
        resolve(outDir, componentName + '.vue'),
        `
        <script setup lang="ts">
        import { ref, defineProps, defineEmits, defineExpose, onMounted } from 'vue'
        import { ${constructorName} } from '${relativePath}';
        
        const elementRef = ref<${constructorName}>();
        
        ${
          reactiveProps.length
            ? `
        const props = defineProps<{
          ${reactiveProps
            .map(({ name, deprecated }) =>
              [getJsDocDescName(name, deprecated), `${constructorName}['${name}']`].join('?: '),
            )
            .join(',\n')}
        }>();
        `
            : ''
        }
        
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

        type ${componentMethodsName} = {
          ${methods
            .map(({ name, deprecated }) =>
              [getJsDocDescName(name, deprecated), `${constructorName}['${name}']`].join(': '),
            )
            .join(';\n')}
        }
        
        defineExpose<${componentMethodsName}>({
          ${methods
            .map(
              ({ name }) => `
                ${name}(...args) {
                  elementRef.value?.${name}(...args)
                }
              `,
            )
            .join(',')}
        })
        
        // prop 可以用 :prop
        onMounted(() => {
          const element = elementRef.value!;
          ${properties.map(({ name, reactive }) => (reactive ? `element.${name} = props.${name}` : '')).join(';\n')}
        })
        
        </script>

        <script lang="ts">
        export * from '${relativePath}';
        export default {
          name: '${componentName}',
        };
        </script>
        
        <template>
          <${tag} ref="elementRef" ${reactiveProps.length ? 'v-bind="props"' : ''} ${events
            .map((event) => [`@${event}`, `"e => emit('change', e)"`].join('='))
            .join(' ')}>
            <slot />
          </${tag}>
        </template>
      `,
      );
    });
  };

  await Promise.all(getElementPathList(elementsDir).map(processFile));
}
