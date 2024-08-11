import type { GemElement, SheetToken, Metadata } from '@mantou/gem';

import type { PanelStore } from '../store';

declare let $0: any;

// 不要使用作用域外的变量
export const getSelectedGem = function (data: PanelStore): PanelStore | string {
  // https://github.com/bramus/scroll-driven-animations-debugger-extension/issues/19
  if (!$0) return `Not Gem: $0 is ${$0}`;
  const { __GEM_DEVTOOLS__HOOK__ } = window;
  if (__GEM_DEVTOOLS__HOOK__) {
    // 不支持多种 GemElement，__GEM_DEVTOOLS__HOOK__ 只记录首个
    const { GemElement } = __GEM_DEVTOOLS__HOOK__;
    if (!GemElement || !($0 instanceof GemElement)) return 'Not Gem: gem hook';
  } else {
    // 没有严格检查是否是 GemElement
    if (!(($0 as any) instanceof HTMLElement)) return 'Not Gem: not HTMLElement';
  }

  const tagClass = $0.constructor as typeof GemElement;
  // Partial supports V1
  const metadata = (Reflect.get(tagClass, Symbol.for('Symbol.metadata')) || tagClass) as Metadata;

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

  const objToString = (arg: any) => {
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
        if (arg instanceof Element) {
          const tag = arg.tagName.toLowerCase();
          return `<${tag}${[...arg.attributes].map((e) => ` ${e.name}="${e.value}"`).join('')}>...</${tag}>`;
        } else if (arg instanceof Node) {
          return `${arg.nodeName} ${arg.nodeValue}`;
        } else if (window.CSSStyleSheet && arg instanceof CSSStyleSheet) {
          return arg.cssRules
            ? Array.from(arg.cssRules)
                .map((rule) => rule.cssText)
                .join('\n')
            : '';
        } else if (Array.isArray(arg)) {
          return `[${arg.map(objToString)}]`;
        } else if (arg instanceof ArrayBuffer) {
          return `ArrayBuffer[${new Uint8Array(arg).slice(0, 5).join()}${arg.byteLength > 5 ? ',...' : ''}]`;
        } else if (arg instanceof Object.getPrototypeOf(Uint8Array.prototype).constructor) {
          return `${arg.constructor.name}[${arg.slice(0, 5).join()}${arg.length > 5 ? ',...' : ''}]`;
        } else if (arg instanceof WeakMap || arg instanceof WeakSet) {
          return `${arg.constructor.name} {...}`;
        } else if (arg instanceof Map || arg instanceof Set) {
          const body = [...arg].reduce((p, key, index) => {
            const kv = Array.isArray(key) ? [key[0], objToString(key[1])] : [key];
            return (p += `${index ? ',' : ''} ${kv.join(' -> ')}`);
          }, '');
          return `${arg.constructor.name} {${body} }`;
        }

        const body = Object.keys(arg).reduce((p, key, index) => {
          return (p += `${index ? ',' : ''} ${key}: ${objToString(arg[key])}`);
        }, '');
        return `{${body} }`;
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
  const elementMethod = new Set([
    'connectedCallback',
    'adoptedCallback',
    'disconnectedCallback',
    'setAttribute',
    'removeAttribute',
    'toggleAttribute',
  ]);
  const lifecycleMethod = new Set(['willMount', 'render', 'mounted', 'shouldUpdate', 'updated', 'unmounted']);
  const buildInMethod = new Set(['update', 'setState', 'effect', 'memo']);
  const buildInProperty = new Set(['internals']);
  const buildInAttribute = new Set(['ref']);
  const memberSet = getProps($0);
  metadata.observedAttributes?.forEach((attr) => {
    const prop = kebabToCamelCase(attr);
    const value = $0[prop];
    memberSet.delete(prop);
    attrs.delete(attr);
    data.observedAttributes.push({
      name: attr,
      value: String(value),
      type: typeof value,
    });
  });
  // 已有的未观测 attribute
  attrs.forEach((attr) => {
    const value = $0.getAttribute(attr)!;
    data.attributes.push({
      name: attr,
      value: value,
      type: 'string',
      buildIn: buildInAttribute.has(attr) ? 1 : 0,
    });
  });
  metadata.observedProperties?.forEach((prop) => {
    memberSet.delete(prop);
    const value = $0[prop];
    const type = value === null ? 'null' : typeof value;
    data.observedProperties.push({
      name: prop,
      value: objectToString(value),
      type,
      path: inspectable(value) ? [prop] : undefined,
    });
  });
  metadata.definedEvents?.forEach((event) => {
    const prop = kebabToCamelCase(event);
    memberSet.delete(prop);
    data.emitters.push({
      name: event,
      value: objectToString($0[prop]),
      type: 'function',
      path: [prop],
    });
  });
  metadata.adoptedStyleSheets?.forEach((sheet, index) => {
    data.adoptedStyles.push({
      name: `StyleSheet${index + 1}`,
      value: objectToString(sheet[Object.getOwnPropertySymbols(sheet)[0] as typeof SheetToken]),
      type: 'object',
      path: ['constructor', 'Symbol.metadata', 'adoptedStyleSheets', String(index)],
    });
  });
  metadata.observedStores?.forEach((store, index) => {
    data.observedStores.push({
      name: `Store${index + 1}`,
      value: objectToString(store),
      type: 'object',
      path: ['constructor', 'Symbol.metadata', 'observedStores', String(index)],
    });
  });
  metadata.definedSlots?.forEach((slot) => {
    const isUnnamed = slot === 'unnamed';
    const prop = kebabToCamelCase(slot);
    if (!$0.constructor[prop]) {
      memberSet.delete(prop);
    }
    const selector = `[slot=${slot}]`;
    let element = isUnnamed ? $0.firstChild : $0.querySelector(selector);
    if (element instanceof HTMLSlotElement) {
      // 只支持 inspect 第一个分配的元素
      element = element.assignedElements()[0] || element;
    }
    const isNode = element && !(element instanceof Element);
    data.slots.push({
      name: slot,
      value: objectToString(element),
      type: element ? 'element' : 'null',
      path: isNode ? ['firstChild'] : element ? ['querySelector', selector] : undefined,
    });
  });
  metadata.definedParts?.forEach((part) => {
    const prop = kebabToCamelCase(part);
    if (!$0.constructor[prop]) {
      memberSet.delete(prop);
    }
    const selector = `[part~=${part}],[exportparts*=${part}]`;
    data.parts.push({
      name: part,
      value: objectToString(($0.shadowRoot || $0).querySelector(selector)),
      type: 'element',
      path: [['shadowRoot', ''], 'querySelector', selector],
    });
  });
  metadata.definedRefs?.forEach((ref) => {
    const prop = kebabToCamelCase(ref.replace(/-\w+$/, ''));
    memberSet.delete(prop);
    data.refs.push({
      name: ref,
      value: objectToString($0[prop].element),
      type: 'element',
      path: [['shadowRoot', ''], 'querySelector', `[ref=${$0[prop].ref}]`],
    });
  });
  metadata.definedCSSStates?.forEach((state) => {
    const prop = kebabToCamelCase(state);
    memberSet.delete(prop);
    data.cssStates.push({
      name: state,
      value: $0[prop],
      type: 'boolean',
    });
  });
  $0.internals?.stateList?.forEach((state: any) => {
    data.stateList.push(
      Object.keys(state).map((k) => {
        const value = state[k];
        return {
          name: k,
          value: objectToString(value),
          type: typeof value,
        };
      }),
    );
  });
  memberSet.forEach((key) => {
    memberSet.delete(key);
    // GemElement 不允许覆盖内置生命周期，所以不考虑
    if (elementMethod.has(key)) return;
    if (key === 'state') {
      $0.state &&
        $0.setState &&
        Object.keys($0.state).forEach((k) => {
          const value = $0.state[k];
          data.state.push({
            name: k,
            value: objectToString(value),
            type: typeof value,
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

  const buildInStaticMember = new Set(['length', 'name', 'prototype']);
  const getStaticMember = (cls: any, set = new Set<string>()) => {
    Object.getOwnPropertyNames(cls).forEach((key) => {
      if (
        !buildInStaticMember.has(key) &&
        !metadata.definedParts?.includes(cls[key]) &&
        !metadata.definedSlots?.includes(cls[key])
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
      buildIn: 0,
    });
  });
  // `Class` self
  data.staticMember.push({
    name: 'constructor',
    type: 'function',
    value: objectToString(tagClass),
    path: ['constructor'],
  });
  data.gemVersion = __GEM_DEVTOOLS__HOOK__?.version ? `v${__GEM_DEVTOOLS__HOOK__.version}` : '';
  return data;
};
