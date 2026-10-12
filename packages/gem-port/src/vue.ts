import { generateComponents, getComponentInfo, getEventsType, getExposeType, getPropsType, toJs } from './common';

/**
 * Vue 3 自动按 `in` 判断设置 Property，Hydration 也会设置自定义元素的 Property，所以属性和事件都直接透传
 */
const runtime = `import { defineComponent, h, ref } from 'vue';

export function createComponent(name, tag, { members }) {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs, slots, expose }) {
      const element = ref();
      expose(
        Object.defineProperties(
          {},
          Object.fromEntries(
            members.map((key) => [
              key,
              {
                get: () => {
                  const value = element.value[key];
                  return typeof value === 'function' ? value.bind(element.value) : value;
                },
              },
            ]),
          ),
        ),
      );
      return () => h(tag, { ...attrs, ref: element }, slots.default?.());
    },
  });
}
`;

/**
 * 类型声明参考：
 * https://vuejs.org/guide/extras/web-components.html#non-vue-web-components-and-typescript
 */
export async function generateVue(elementsDir: string, outDir: string, ns: string) {
  await generateComponents(elementsDir, outDir, ns, {
    runtime,
    getJs: (details) => `import { createComponent } from './_runtime.js';

${details
  .map((detail) => {
    const { componentName, members } = getComponentInfo(detail);
    return `export const ${componentName} = createComponent('${componentName}', '${detail.name}', ${toJs({ members })});`;
  })
  .join('\n')}
`,
    getDts: (details) => {
      const elements = details.map((detail) => {
        const { name: tag, constructorName } = detail;
        const { componentName, members, events } = getComponentInfo(detail);
        // 避免和 `HTMLAttributes` 中的同名原生事件（例如 `onChange`）冲突
        const omitKeys = [`keyof ${componentName}Props`, ...Object.keys(events).map((key) => `'${key}'`)].join(' | ');
        const typeProps = `
          /** @deprecated only for template type checking */
          $props: Omit<HTMLAttributes, ${omitKeys}> & ${componentName}Props & PublicProps;
          /** @deprecated only for template type checking */
          $emit: EmitFn<${componentName}Events>;`;
        return {
          tag,
          type: `
export type ${componentName}Props = ${getPropsType(detail)};
export type ${componentName}Events = ${getEventsType(detail)};
export type ${componentName}Expose = ${getExposeType(detail, members)};
export declare const ${componentName}: new () => ${componentName}Expose & {
  ${typeProps}
  /** @deprecated only for template type checking */
  $slots: { default?: () => any };
};
type ${componentName}Element = new () => ${constructorName} & {
  ${typeProps}
};`,
          componentName,
        };
      });
      return `import type { EmitFn, HTMLAttributes, PublicProps } from 'vue';
${elements.map(({ type }) => type).join('\n')}

declare module 'vue' {
  interface GlobalComponents {
    ${elements.map(({ tag, componentName }) => `'${tag}': ${componentName}Element;`).join('\n')}
  }
}
`;
    },
  });
}
