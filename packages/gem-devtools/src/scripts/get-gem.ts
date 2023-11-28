import type { GemElement, SheetToken } from '@mantou/gem';

import type { PanelStore } from '../store';

declare let $0: any;

// 不要使用作用域外的变量
export const getSelectedGem = function (data: PanelStore, gemElementSymbols: string[]): PanelStore | null {
  const tagClass = $0.constructor as typeof GemElement;
  const devToolsHook = window.__GEM_DEVTOOLS__HOOK__;
  if (devToolsHook) {
    if (!devToolsHook.GemElement || !($0 instanceof devToolsHook.GemElement)) return null;
  } else {
    // 依赖 `constructor`，如果 `constructor` 被破坏，则扩展不能工作
    // 没有严格检查是否是 GemElement
    if (!($0 instanceof HTMLElement)) return null;

    const elementSymbols = new Set(Object.getOwnPropertySymbols($0).map(String));
    if (gemElementSymbols.some((symbol) => !elementSymbols.has(symbol))) return null;
  }

  const inspectable = (value: any) => {
    const type = typeof value;
    return (type === 'object' && value) || type === 'function';
  };

  const funcToString = (func: () => void) => {
    // bound 方法
    if (func.toString() === 'function () { [native code] }') {
      return `function ${func.name} {...}`;
    } else {
      return func.toString().replace(/{.*}/s, '{...}');
    }
  };

  const objToString = (arg: string) => {
    if (arg === null) return 'null';
    switch (typeof arg) {
      case 'function':
        return funcToString(arg);
      case 'object':
        return '{...}';
      case 'string':
        return `"${String(arg)}"`;
      default:
        return String(arg);
    }
  };

  const objectToString = (arg: any) => {
    if (arg === null) return 'null';
    switch (typeof arg) {
      case 'function':
        return funcToString(arg);
      case 'object': {
        if (arg instanceof HTMLElement) {
          try {
            return (arg.cloneNode() as HTMLElement).outerHTML.replace('><', '>...<');
          } catch {
            // element prototype
          }
        } else if (window.CSSStyleSheet && arg instanceof CSSStyleSheet) {
          return arg.cssRules
            ? Array.from(arg.cssRules)
                .map((rule) => rule.cssText)
                .join('\n')
            : '';
        } else if (Array.isArray(arg)) {
          return `[${arg.map(objToString)}]`;
        }

        const body = Object.keys(arg).reduce((p, key, index) => {
          return (p += `${index ? ',' : ''} ${key}: ${objToString(arg[key])}`);
        }, '');
        return `{${body}}`;
      }
      default:
        return String(arg);
    }
  };

  const getProps = (obj: any, set = new Set<string>()) => {
    Object.getOwnPropertyNames(obj).forEach((key) => {
      if (key !== 'constructor') set.add(key);
    });
    const proto = Object.getPrototypeOf(obj);
    if (proto !== HTMLElement.prototype) getProps(proto, set);
    return set;
  };

  const kebabToCamelCase = (str: string) => str.replace(/-(.)/g, (_substr, $1: string) => $1.toUpperCase());
  const attrs: Set<string> = $0.attributes ? new Set([...$0.attributes].map((attr) => attr.nodeName)) : new Set();
  const lifecycleMethod = new Set(['willMount', 'render', 'mounted', 'shouldUpdate', 'updated', 'unmounted']);
  const buildInLifecycleMethod = new Set(['connectedCallback', 'attributeChangedCallback', 'disconnectedCallback']);
  const buildInMethod = new Set(['update', 'setState', 'effect', 'memo', 'closestElement']);
  const buildInProperty = new Set(['internals']);
  const buildInAttribute = new Set(['ref']);
  const member = getProps($0);
  tagClass.observedAttributes?.forEach((attr) => {
    const prop = kebabToCamelCase(attr);
    const value = $0[prop];
    member.delete(prop);
    attrs.delete(attr);
    data.observedAttributes.push({
      name: attr,
      value: String(value),
      type: typeof value,
    });
  });
  attrs.forEach((attr) => {
    const value = $0.getAttribute(attr);
    data.attributes.push({
      name: attr,
      value: value,
      type: 'string',
      buildIn: buildInAttribute.has(attr) ? 1 : 0,
    });
  });
  tagClass.observedProperties?.forEach((prop) => {
    member.delete(prop);
    const value = $0[prop];
    const type = value === null ? 'null' : typeof value;
    data.observedProperties.push({
      name: prop,
      value: objectToString(value),
      type,
      path: inspectable(value) ? [prop] : undefined,
    });
  });
  tagClass.defineEvents?.forEach((event) => {
    const prop = kebabToCamelCase(event);
    member.delete(prop);
    data.emitters.push({
      name: event,
      value: objectToString($0[prop]),
      type: 'function',
      path: [prop],
    });
  });
  tagClass.adoptedStyleSheets?.forEach((sheet, index) => {
    data.adoptedStyles.push({
      name: `StyleSheet${index + 1}`,
      value: objectToString(sheet[Object.getOwnPropertySymbols(sheet)[0] as typeof SheetToken]),
      type: 'object',
      path: ['constructor', 'adoptedStyleSheets', String(index)],
    });
  });
  tagClass.observedStores?.forEach((store, index) => {
    data.observedStores.push({
      name: `Store${index + 1}`,
      value: objectToString(store),
      type: 'object',
      path: ['constructor', 'observedStores', String(index)],
    });
  });
  tagClass.defineSlots?.forEach((slot) => {
    const prop = kebabToCamelCase(slot);
    if (!$0.constructor[prop]) {
      member.delete(prop);
    }
    const selector = `[slot=${slot}]`;
    let element = $0.querySelector(selector);
    if (element instanceof HTMLSlotElement) {
      // 只支持 inspect 第一个分配的元素
      element = element.assignedElements()[0] || element;
    }
    data.slots.push({
      name: slot,
      value: objectToString(element),
      type: element ? 'element' : 'null',
      path: element ? ['querySelector', selector] : undefined,
    });
  });
  tagClass.defineParts?.forEach((part) => {
    const prop = kebabToCamelCase(part);
    if (!$0.constructor[prop]) {
      member.delete(prop);
    }
    const selector = `[part~=${part}],[exportparts*=${part}]`;
    data.parts.push({
      name: part,
      value: objectToString(($0.shadowRoot || $0).querySelector(selector)),
      type: 'element',
      path: [['shadowRoot', ''], 'querySelector', selector],
    });
  });
  tagClass.defineRefs?.forEach((ref) => {
    const prop = kebabToCamelCase(ref.replace(/-\w+$/, ''));
    member.delete(prop);
    data.refs.push({
      name: ref,
      value: objectToString($0[prop].element),
      type: 'element',
      path: [['shadowRoot', ''], 'querySelector', `[ref=${$0[prop].ref}]`],
    });
  });
  tagClass.defineCSSStates?.forEach((state) => {
    const prop = kebabToCamelCase(state);
    member.delete(prop);
    data.cssStates.push({
      name: state,
      value: $0[prop],
      type: 'boolean',
    });
  });
  member.forEach((key) => {
    member.delete(key);
    // GemElement 不允许覆盖内置生命周期，所以不考虑
    if (buildInLifecycleMethod.has(key)) return;
    if (key === 'state') {
      $0.state &&
        Object.keys($0.state).forEach((k) => {
          const value = $0.state[k];
          data.state.push({
            name: k,
            value: objectToString(value),
            type: 'boolean',
          });
        });
      return;
    }
    if (lifecycleMethod.has(key)) {
      data.lifecycleMethod.push({
        name: key,
        value: objectToString($0[key]),
        type: 'function',
        path: [key],
      });
      return;
    }
    if (typeof $0[key] === 'function') {
      data.method.push({
        name: key,
        value: objectToString($0[key]),
        type: 'function',
        path: [key],
        buildIn: buildInMethod.has(key) ? 2 : 0,
      });
      return;
    }
    data.properties.push({
      name: key,
      value: objectToString($0[key]),
      type: typeof $0[key],
      path: [key],
      buildIn: buildInProperty.has(key) ? 2 : 0,
    });
  });

  const buildInStaticMember = new Set([
    'length',
    'name',
    'prototype',
    'observedAttributes',
    'booleanAttributes',
    'numberAttributes',
    'observedProperties',
    'observedStores',
    'adoptedStyleSheets',
    'defineEvents',
    'defineCSSStates',
    'defineRefs',
    'defineParts',
    'defineSlots',
  ]);
  const getStaticMember = (cls: any, set = new Set<string>()) => {
    Object.getOwnPropertyNames(cls).forEach((key) => {
      if (
        !buildInStaticMember.has(key) &&
        !tagClass.defineParts?.includes(cls[key]) &&
        !tagClass.defineSlots?.includes(cls[key])
      ) {
        set.add(key);
      }
    });
    const proto = Object.getPrototypeOf(cls);
    if (proto !== HTMLElement) getStaticMember(proto, set);
    return set;
  };
  const staticMember = getStaticMember(tagClass);
  staticMember.forEach((key) => {
    const value = $0.constructor[key];
    data.staticMember.push({
      name: key,
      type: typeof value,
      value: objectToString(value),
      path: inspectable(value) ? ['constructor', key] : undefined,
    });
  });
  // `Class` self
  data.staticMember.push({
    name: 'constructor',
    type: 'function',
    value: objectToString(tagClass),
    path: ['constructor'],
  });
  return data;
};
