import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import { getComponentName, getElementPathList, getFileElements, getRelativePath } from './common';

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

export function compileVue(elementsDir: string, outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  getElementPathList(elementsDir).forEach((elementFilePath) => {
    getFileElements(elementFilePath).forEach(({ name: tag, properties, constructorName, methods, events }) => {
      const componentName = getComponentName(tag);
      const componentMethodsName = `${componentName}Methods`;
      const relativePath = getRelativePath(elementFilePath, outDir);
      const props = properties.filter(({ reactive }) => !!reactive);
      writeFileSync(
        resolve(outDir, componentName + '.vue'),
        `
        <script setup lang="ts">
        import { ref, defineProps, defineEmits, defineExpose, onMounted } from 'vue'
        import { ${constructorName} } from '${relativePath}';
        
        const elementRef = ref<${constructorName}>();
        
        ${
          props.length
            ? `
        const props = defineProps<{
          ${props.map(({ name }) => [name, `${constructorName}['${name}']`].join('?: ')).join(',\n')}
        }>();
        `
            : ''
        }
        
        const emit = defineEmits<{
          ${properties
            .filter(({ event }) => !!event)
            .map(({ name }) => [name, `[event: CustomEvent<Parameters<${constructorName}['${name}']>[0]>]`].join(': '))
            .join(',\n')}
        }>()

        type ${componentMethodsName} = {
          ${methods.map(({ name }) => [name, `typeof ${constructorName}.prototype.${name}`].join(': ')).join(';')}
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
          <${tag} ref="elementRef" ${props.length ? 'v-bind="props"' : ''} ${events
          .map((event) => [`@${event}`, `"e => emit('change', e)"`].join('='))
          .join(' ')}>
            <slot />
          </${tag}>
        </template>
      `,
      );
    });
  });
}
