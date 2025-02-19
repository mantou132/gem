import { GemElement, UpdateToken, type Metadata } from '../lib/reactive';
import { property, attribute, numattribute, boolattribute, emitter, state } from '../lib/decorators';
import type { Store } from '../lib/store';

import { Logger } from './logger';

const logger = new Logger('HMR');

const nativeDefineElement = window.customElements.define.bind(window.customElements);

const cache = new Map<string, Element[]>();
function updateElement(name: string, fn: (ele: Element) => void) {
  if (!cache.has(name)) {
    const elements = [];
    const temp: Element[] = [document.documentElement];
    while (!!temp.length) {
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

/** 不支持修改 store */
function checkMetadataNeedReload({ mode, penetrable, noBlocking, observedStores }: Metadata, newMetadata: Metadata) {
  const stringifyStores = (stores?: Store<any>[]) =>
    JSON.stringify(
      stores?.map((store) => JSON.stringify({ ...store }, (_, v) => (typeof v === 'function' ? v.toString() : v))),
    );
  if (
    mode !== newMetadata.mode ||
    penetrable !== newMetadata.penetrable ||
    noBlocking !== newMetadata.noBlocking ||
    stringifyStores(observedStores) !== stringifyStores(newMetadata.observedStores)
  ) {
    return true;
  }
}

/** 不支持删减函数字段，因为原函数可能已经被绑定 */
function checkClassNeedReload(existed: CustomElementConstructor, newClass: CustomElementConstructor) {
  if (
    getHmrMethodKeys(existed).join() !== getHmrMethodKeys(newClass).join() ||
    getHmrMethodKeys(existed.prototype).join() !== getHmrMethodKeys(newClass.prototype).join()
  ) {
    return true;
  }
}

/** 不支持删减实例其他字段，因为新实例总是使用老 Class 定义 */
function checkFieldsNeedReload({ instanceFields }: ReturnType<typeof getFields>) {
  if (instanceFields.other?.add?.length || instanceFields.other?.remove?.length) {
    return true;
  }
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

type HasFieldsRecordClass = { _defined_fields_?: [string, string, boolean][] };
function getFields(existed: CustomElementConstructor, newClass: CustomElementConstructor) {
  const translate = (cls: HasFieldsRecordClass) => {
    const fieldList = (cls._defined_fields_ || []).map(([name, type, isStatic]) => ({ name, type, isStatic }));
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
};

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
    _hmrRegisterClass: (name: string) => (cls: HasFieldsRecordClass, ctx: ClassDecoratorContext) => void;
  }
}

window._hmrClassRegistry = new Map();
window._hmrRegisterClass = function (name: string) {
  return function (cls: HasFieldsRecordClass, { addInitializer }: ClassDecoratorContext) {
    addInitializer(() => {
      const existed = window._hmrClassRegistry.get(name);

      if (!existed) {
        window._hmrClassRegistry.set(name, cls);
        return;
      }

      logger.info(`class <${name}> update,`, { existed, cls });

      let current: any[] = [existed, cls];
      while (current) {
        const [oldClass, newClass] = current;
        if (oldClass === newClass || current.some((e) => e === GemElement || e === Function.prototype)) break;
        if (current.some((e) => !e) || checkClassNeedReload(oldClass, newClass)) {
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
              setProperty(element, prop.name, undefined);
            });
          });
        });
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

        [
          [oldClass, newClass],
          [oldClass.prototype, newClass.prototype],
        ].forEach(([existedObj, newObj]) => {
          Object.assign(
            existedObj,
            Object.fromEntries(
              getHmrMethodKeys(newObj)
                .filter((key) => existedObj[key].toString() !== newObj[key].toString())
                .map((key) => [key, newObj[key]]),
            ),
          );
        });

        current = [getPrototypeOf(oldClass), getPrototypeOf(newClass)];
      }
    });
  };
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
      // 触发样式更新，支持 Light DOM
      element.after(element);
      // 重新渲染
      (element as any)[UpdateToken]?.();
    });
  });
};
