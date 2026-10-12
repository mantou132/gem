import {
  generateComponents,
  getComponentInfo,
  getEventProp,
  getEventsType,
  getExposeType,
  getPropsType,
  toJs,
} from './common';

const runtime = `import { createElement, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export function createComponent(tag, { properties, events, members }) {
  return function Component({ ref, ...props }) {
    const elementRef = useRef(null);
    const propsRef = useRef(props);
    propsRef.current = props;

    useImperativeHandle(
      ref,
      () =>
        Object.defineProperties(
          {},
          Object.fromEntries(
            members.map((name) => [
              name,
              {
                get: () => {
                  const element = elementRef.current;
                  const value = element[name];
                  return typeof value === 'function' ? value.bind(element) : value;
                },
              },
            ]),
          ),
        ),
      [],
    );

    // React hydration 不会设置自定义元素的 Property 和事件，所以都由组件设置
    useLayoutEffect(() => {
      const element = elementRef.current;
      properties.forEach((name) => {
        if (name in props) element[name] = props[name];
      });
    }, properties.map((name) => props[name]));

    useLayoutEffect(() => {
      const element = elementRef.current;
      const listeners = Object.entries(events).map(([key, type]) => [type, (evt) => propsRef.current[key]?.(evt)]);
      listeners.forEach(([type, listener]) => element.addEventListener(type, listener));
      return () => listeners.forEach(([type, listener]) => element.removeEventListener(type, listener));
    }, []);

    const attrs = Object.fromEntries(
      Object.entries(props).filter(([key]) => !properties.includes(key) && !(key in events)),
    );
    return createElement(tag, { ...attrs, ref: elementRef });
  };
}
`;

export async function generateReact(elementsDir: string, outDir: string, ns: string) {
  await generateComponents(elementsDir, outDir, ns, {
    runtime,
    getJs: (details) => `import { createComponent } from './_runtime.js';

${details
  .map((detail) => {
    const { componentName, properties, events, members } = getComponentInfo(detail);
    return `export const ${componentName} = createComponent('${detail.name}', ${toJs({ properties, events, members })});`;
  })
  .join('\n')}
`,
    getDts: (details) => {
      const elements = details.map((detail) => {
        const { name: tag, constructorName } = detail;
        const { componentName, members } = getComponentInfo(detail);
        const htmlProps = `DetailedHTMLProps<HTMLAttributes<${constructorName}>, ${constructorName}>`;
        return {
          tag,
          componentName,
          type: `
type ${componentName}Attributes = ${getPropsType(detail)};
export type ${componentName}Props = Omit<${htmlProps}, keyof ${componentName}Attributes | keyof ${componentName}Events | 'ref'> &
  ${componentName}Attributes & Partial<${componentName}Events> & { ref?: Ref<${componentName}Expose> };
export type ${componentName}Events = ${getEventsType(detail, getEventProp)};
export type ${componentName}Expose = ${getExposeType(detail, members)};
export declare const ${componentName}: FC<${componentName}Props>;
type ${componentName}ElementEvents = Partial<${getEventsType(detail, (event) => `on${event}`)}>;
type ${componentName}ElementProps = Omit<${htmlProps}, keyof ${componentName}Attributes | keyof ${componentName}ElementEvents> &
  ${componentName}Attributes & ${componentName}ElementEvents;`,
        };
      });
      return `import type { DetailedHTMLProps, FC, HTMLAttributes, Ref } from 'react';
${elements.map(({ type }) => type).join('\n')}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      ${elements.map(({ tag, componentName }) => `'${tag}': ${componentName}ElementProps;`).join('\n')}
    }
  }
}
`;
    },
  });
}
