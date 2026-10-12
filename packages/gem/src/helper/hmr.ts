import { attribute, boolattribute, emitter, globalemitter, numattribute, property, state } from '../lib/decorators';
import { ChildPart, type TemplateResult } from '../lib/lit-html';
import { GemElement, type Metadata, UpdateToken } from '../lib/reactive';
import type { Store } from '../lib/store';
import { camelToKebabCase } from '../lib/utils';
import { Logger } from './logger';

const logger = new Logger('HMR');

const nativeDefineElement =
  typeof window === 'undefined' || !window.customElements
    ? undefined
    : window.customElements.define.bind(window.customElements);

const cache = new Map<string, Element[]>();
function updateElement(name: string, fn: (ele: Element) => void) {
  if (!cache.has(name)) {
    const elements = [];
    const temp: Element[] = [document.documentElement];
    while (temp.length) {
      const element = temp.pop()!;
      if (element.tagName.toLowerCase() === name) elements.push(element);
      temp.push(...[...element.children, ...(element.shadowRoot?.children || [])].reverse());
    }
    cache.set(name, elements);
  }
  const elements = cache.get(name)!;
  if (elements.length === 0) {
    const ele = document.createElement(name);
    Element.prototype.remove.apply(ele);
    fn(ele);
  } else {
    elements.forEach(fn);
  }
  queueMicrotask(() => cache.delete(name));
}

function getMetadata(cons: any): Metadata {
  return (cons as any)[Symbol.metadata] || {};
}

function getHmrMethodKeys(obj: any) {
  return Object.getOwnPropertyNames(obj).filter((key) => key.startsWith('_hmr_'));
}

/** 连接的 store 必须是同一对象，否则元素订阅的是老 store */
function checkMetadataNeedReload({ mode, penetrable, noBlocking, observedStores }: Metadata, newMetadata: Metadata) {
  const isSameStores = (a: Store<any>[] = [], b: Store<any>[] = []) =>
    a.length === b.length && a.every((store, i) => store === b[i]);
  if (
    mode !== newMetadata.mode ||
    penetrable !== newMetadata.penetrable ||
    noBlocking !== newMetadata.noBlocking ||
    !isSameStores(observedStores, newMetadata.observedStores)
  ) {
    return true;
  }
}

/** 不支持删减实例其他字段、有装饰器的函数成员和构造函数，因为新实例总是使用老 Class 定义 */
function checkFieldsNeedReload({ instanceFields }: ReturnType<typeof getFields>) {
  return [instanceFields.other, instanceFields.ctor].some((diff) => diff?.add.length || diff?.remove.length);
}

function diffArr<T>(oldList: T[], newList: T[], fn: (i: T) => string = (e) => String(e)) {
  const getMap = (list: T[]) => new Map(list.map((e) => [fn(e), e]));
  const oldMap = getMap(oldList);
  const newMap = getMap(newList);
  const result = { remove: [] as T[], add: [] as T[], some: [] as T[], all: [] as T[] };
  getMap([...oldList, ...newList]).forEach((e, k) => {
    result.all.push(e);
    if (newMap.has(k) && oldMap.has(k)) {
      result.some.push(e);
    } else if (!newMap.has(k)) {
      result.remove.push(e);
    } else if (!oldMap.has(k)) {
      result.add.push(e);
    }
  });
  return result;
}

function diffRecord<T>(oldRecord: Partial<Record<string, T[]>>, newRecord: Partial<Record<string, T[]>>) {
  const oldKeys = Object.keys(oldRecord);
  const newKeys = Object.keys(newRecord);
  return diffArr(oldKeys, newKeys);
}

type HasFieldsRecordClass = { _defined_fields_?: [string, string, boolean, string?][] };
function getFields(existed: CustomElementConstructor, newClass: CustomElementConstructor) {
  const translate = (cls: HasFieldsRecordClass) => {
    const fieldList = (cls._defined_fields_ || []).map(([name, type, isStatic, shadow]) => ({
      name,
      type,
      isStatic,
      shadow,
    }));
    const fieldGroup = Object.groupBy(fieldList, ({ isStatic }) => (isStatic ? 'staticFields' : 'instanceFields'));
    const groupBy = (list: typeof fieldGroup.staticFields) => Object.groupBy(list || [], ({ type }) => type);
    return {
      staticFields: groupBy(fieldGroup.staticFields),
      instanceFields: groupBy(fieldGroup.instanceFields),
    };
  };
  const oldFields = translate(existed as unknown as HasFieldsRecordClass);
  const newFields = translate(newClass as unknown as HasFieldsRecordClass);
  const result = Object.fromEntries(
    Object.entries(oldFields).map(([classFieldType]: [keyof typeof oldFields, any]) => [
      classFieldType,
      Object.fromEntries(
        diffRecord(oldFields[classFieldType], newFields[classFieldType]).all.map((type) => [
          type,
          diffArr(oldFields[classFieldType][type] || [], newFields[classFieldType][type] || [], ({ name }) => name),
        ]),
      ),
    ]),
  );
  return result as Record<keyof typeof oldFields, (typeof result)[0]>;
}

const deleteProperty = Reflect.deleteProperty;
const getProperty = Reflect.get;
const getPrototypeOf = Reflect.getPrototypeOf;
const setProperty = (target: any, propertyKey: string | symbol, value: any) =>
  Reflect.defineProperty(target, propertyKey, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
const safeProp = new Set(['part', 'slot', 'other']);
const descMap = {
  attribute,
  boolattribute,
  numattribute,
  property,
  state,
  emitter,
  globalemitter,
};

const attrTypes = new Set(['attribute', 'boolattribute', 'numattribute']);

/** 新增 attribute 的初始值本应在构造时读取，但新实例仍由老类构造，改为首次读取时从 DOM 获取 */
function lazyInitAttribute(proto: any, prop: string) {
  const { get, set } = Object.getOwnPropertyDescriptor(proto, prop)!;
  const attr = camelToKebabCase(prop);
  Reflect.defineProperty(proto, prop, {
    configurable: true,
    set,
    get() {
      if (get!.call(this) === undefined) set!.call(this, this.getAttribute(attr));
      return get!.call(this);
    },
  });
}

/** 新增的箭头函数字段不会被老类构造，首次访问时为实例（静态字段为类）创建代理 */
function defineLazyFn(target: any, name: string, shadow: string) {
  Reflect.defineProperty(target, name, {
    configurable: true,
    get() {
      const fn = (...args: any[]) => this[shadow](...args);
      setProperty(this, name, fn);
      return fn;
    },
  });
}

/** 函数成员的代理只调用影子方法，可以直接复制到老类上 */
function updateFnMembers(oldTarget: any, newTarget: any, diffs: ReturnType<typeof getFields>['staticFields']) {
  const { method, fn } = diffs;
  method?.add.concat(method.some).forEach(({ name }) => {
    Reflect.defineProperty(oldTarget, name, Object.getOwnPropertyDescriptor(newTarget, name)!);
  });
  fn?.add.forEach(({ name, shadow }) => defineLazyFn(oldTarget, name, shadow!));
  [method?.remove, fn?.remove].forEach((list) => list?.forEach(({ name }) => deleteProperty(oldTarget, name)));
}

function setArrValue<T>(obj: any, field: string, val: T[] = []) {
  if (!Object.getOwnPropertyDescriptor(obj, field)) {
    setProperty(obj, field, val);
  } else {
    const old = obj[field] as T[];
    old.length = 0;
    old.push(...val);
  }
}

declare global {
  interface Window {
    _hmrClassRegistry: Map<string, any>;
    _hmrRegisterClass: (name: string) => (cls: HasFieldsRecordClass, ctx: ClassDecoratorContext) => any;
    _hmrKeep: <T>(key: string, fn: () => T) => T;
  }
}

if (typeof window !== 'undefined' && nativeDefineElement && !window._hmrClassRegistry) {
  window._hmrClassRegistry = new Map();

  // 模块重新执行时复用模块顶层的 store
  const keptValues = new Map<string, any>();
  window._hmrKeep = (key, fn) => {
    if (!keptValues.has(key)) keptValues.set(key, fn());
    return keptValues.get(key);
  };

  // 模块重新执行后模板字符串是新对象，内容相同时使用老对象，以便复用已渲染的 DOM
  const canonicalStrings = new Map<string, TemplateStringsArray>();
  const stringsMap = new WeakMap<TemplateStringsArray, TemplateStringsArray>();
  const { _$getTemplate } = ChildPart.prototype;
  ChildPart.prototype._$getTemplate = function (result: TemplateResult) {
    let strings = stringsMap.get(result.strings);
    if (!strings) {
      const key = `${result.type}:${result.strings.join('\0')}`;
      strings = canonicalStrings.get(key) || result.strings;
      canonicalStrings.set(key, strings);
      stringsMap.set(result.strings, strings);
    }
    result.strings = strings;
    return _$getTemplate.call(this, result);
  };

  window._hmrRegisterClass =
    (name: string) =>
    (cls: HasFieldsRecordClass, { addInitializer }: ClassDecoratorContext) => {
      const existed = window._hmrClassRegistry.get(name);

      addInitializer(() => {
        if (!existed) {
          window._hmrClassRegistry.set(name, cls);
          return;
        }

        logger.info(`class <${name}> update,`, { existed, cls });

        let current: any[] = [existed, cls];
        while (current) {
          const [oldClass, newClass] = current;
          if (oldClass === newClass || current.some((e) => e === GemElement || e === Function.prototype)) break;
          if (current.some((e) => !e)) {
            location.reload();
            return;
          }

          // 修正 `instanceof`
          setProperty(newClass, Symbol.hasInstance, function hasInstance(instance: any) {
            const isOldInstance = instance instanceof oldClass;
            if (isOldInstance) return true;
            setProperty(newClass, Symbol.hasInstance, undefined);
            const isNew = instance instanceof newClass;
            setProperty(newClass, Symbol.hasInstance, hasInstance);
            return isNew;
          });

          const oldMetadata = getMetadata(oldClass);
          const newMetadata = getMetadata(newClass);

          if (checkMetadataNeedReload(oldMetadata, newMetadata)) {
            location.reload();
            return;
          }

          const fields = getFields(oldClass, newClass);

          if (checkFieldsNeedReload(fields)) {
            location.reload();
            return;
          }

          Object.entries(fields.staticFields).forEach(([type, { remove, add }]) => {
            remove.forEach((prop) => {
              if (safeProp.has(type)) {
                deleteProperty(oldClass, prop.name);
              }
            });
            add.forEach((prop) => {
              if (safeProp.has(type)) {
                setProperty(oldClass, prop.name, getProperty(newClass, prop.name));
              }
            });
          });

          const instanceFieldsEntries = Object.entries(fields.instanceFields);
          // 删除的属性重新加回来要先清除占位值
          instanceFieldsEntries.forEach(([type, { add }]) => {
            add.forEach((prop) => {
              if (type in descMap) {
                deleteProperty(oldClass.prototype, prop.name);
              }
            });
          });
          updateElement(name, (element) => {
            instanceFieldsEntries.forEach(([type, { add, remove }]) => {
              add.forEach((prop) => {
                if (type in descMap) {
                  (descMap as any)[type](undefined, {
                    name: prop.name,
                    metadata: oldMetadata,
                    addInitializer: (fn: () => void) => fn.apply(element),
                  } as ClassMemberDecoratorContext);
                }
              });
              remove.forEach((prop) => {
                if (type in descMap) {
                  setProperty(element, prop.name, undefined);
                }
              });
            });
          });
          instanceFieldsEntries.forEach(([type, { add }]) => {
            if (attrTypes.has(type)) add.forEach((prop) => lazyInitAttribute(oldClass.prototype, prop.name));
          });
          updateFnMembers(oldClass, newClass, fields.staticFields);
          updateFnMembers(oldClass.prototype, newClass.prototype, fields.instanceFields);
          // 删除的属性在 proto 上添加占位符
          instanceFieldsEntries.forEach(([type, { remove }]) => {
            remove.forEach((prop) => {
              if (type in descMap) {
                // attribute 映射 prop 没有移除
                setProperty(oldClass.prototype, prop.name, undefined);
              }
            });
          });

          setArrValue(oldMetadata, 'definedParts', newMetadata.definedParts);
          setArrValue(oldMetadata, 'definedSlots', newMetadata.definedSlots);
          setArrValue(oldMetadata, 'observedProperties', newMetadata.observedProperties);
          setArrValue(oldMetadata, 'observedAttributes', newMetadata.observedAttributes);
          setArrValue(oldMetadata, 'definedEvents', newMetadata.definedEvents);
          setArrValue(oldMetadata, 'definedCSSStates', newMetadata.definedCSSStates);
          setArrValue(oldMetadata, 'adoptedStyleSheets', newMetadata.adoptedStyleSheets);
          setArrValue(oldClass, '_defined_fields_', newClass._defined_fields_);

          // 全部替换，让所有方法都引用新模块的变量
          [
            [oldClass, newClass],
            [oldClass.prototype, newClass.prototype],
          ].forEach(([existedObj, newObj]) => {
            getHmrMethodKeys(newObj).forEach((key) => (existedObj[key] = newObj[key]));
          });

          current = [getPrototypeOf(oldClass), getPrototypeOf(newClass)];
        }
      });

      if (!existed) return;

      // 新类未注册，构造时使用老类，例如 `new MyElement()`
      const proxy: any = new Proxy(cls, {
        construct: (_, args, newTarget) => Reflect.construct(existed, args, newTarget === proxy ? existed : newTarget),
      });
      return proxy;
    };

  window.customElements.define = (name: string, cls: CustomElementConstructor) => {
    const existed = customElements.get(name);

    if (!existed) {
      nativeDefineElement(name, cls);
      return;
    }

    // 等待类更新
    queueMicrotask(() => {
      logger.info(`<${name}> update,`, { cls });

      updateElement(name, (element) => {
        // 触发样式更新，支持 Light DOM；不移动元素，避免失去焦点和滚动位置
        if (element.isConnected) {
          (element as GemElement).disconnectedCallback();
          (element as GemElement).connectedCallback();
        }
        // 重新渲染
        (element as any)[UpdateToken]?.();
      });
    });
  };
}
