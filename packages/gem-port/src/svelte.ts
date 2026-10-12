import type { ElementDetail } from 'gem-analyzer';

import {
  generateComponents,
  getComponentInfo,
  getEventProp,
  getEventsType,
  getExposeType,
  getPropsType,
  toJs,
} from './common';

const runtime = `export function omitEvents(props, events) {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !(key in events)));
}

export function listen(element, props, events) {
  const listeners = Object.entries(events).map(([key, type]) => [type, (evt) => props[key]?.(evt)]);
  listeners.forEach(([type, listener]) => element.addEventListener(type, listener));
  return () => listeners.forEach(([type, listener]) => element.removeEventListener(type, listener));
}
`;

/**
 * Svelte 5 组件实例只能导出函数，所以 getter 也导出成同名函数
 */
function getSvelteComponent(detail: ElementDetail) {
  const { events, methods, getters } = getComponentInfo(detail);
  return `<script>
  import { listen, omitEvents } from './_runtime.js';

  let { children, ...props } = $props();
  let element = $state();
  const events = ${toJs(events)};

  $effect(() => listen(element, props, events));
${methods.map((name) => `\n  export function ${name}(...args) {\n    return element.${name}(...args);\n  }`).join('\n')}
${getters.map((name) => `\n  export function ${name}() {\n    return element.${name};\n  }`).join('\n')}
</script>

<${detail.name} bind:this={element} {...omitEvents(props, events)}>{@render children?.()}</${detail.name}>
`;
}

export async function generateSvelte(elementsDir: string, outDir: string, ns: string) {
  await generateComponents(elementsDir, outDir, ns, {
    runtime,
    getJs: (details) =>
      details
        .map((detail) => {
          const { componentName } = getComponentInfo(detail);
          return `export { default as ${componentName} } from './${componentName}.svelte';\n`;
        })
        .join(''),
    getDts: (details) => {
      const elements = details.map((detail) => {
        const { name: tag, constructorName } = detail;
        const { componentName, methods, getters } = getComponentInfo(detail);
        const getterTypes = getters.map((name) => `'${name}': () => ${constructorName}['${name}'];`).join('\n');
        return {
          tag,
          componentName,
          type: `
type ${componentName}Attributes = ${getPropsType(detail)};
export type ${componentName}Props = Omit<HTMLAttributes<${constructorName}>, keyof ${componentName}Attributes | keyof ${componentName}Events> &
  ${componentName}Attributes & Partial<${componentName}Events>;
export type ${componentName}Events = ${getEventsType(detail, getEventProp)};
export type ${componentName}Expose = ${getExposeType(detail, methods)} & {\n${getterTypes}\n};
export declare const ${componentName}: Component<${componentName}Props, ${componentName}Expose>;
type ${componentName}ElementEvents = Partial<${getEventsType(detail, (event) => `on${event}`)}>;
type ${componentName}ElementProps = Omit<HTMLAttributes<${constructorName}>, keyof ${componentName}Attributes | keyof ${componentName}ElementEvents> &
  ${componentName}Attributes & ${componentName}ElementEvents;`,
        };
      });
      return `import type { Component } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
${elements.map(({ type }) => type).join('\n')}

declare module 'svelte/elements' {
  interface SvelteHTMLElements {
    ${elements.map(({ tag, componentName }) => `'${tag}': ${componentName}ElementProps;`).join('\n')}
  }
}
`;
    },
    getExtraFiles: (details) =>
      Object.fromEntries(
        details.map((detail) => [`${getComponentInfo(detail).componentName}.svelte`, getSvelteComponent(detail)]),
      ),
  });
}
