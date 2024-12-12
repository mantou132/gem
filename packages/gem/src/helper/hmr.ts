import { cleanObject } from '../lib/utils';
import { UpdateToken, type Metadata } from '../lib/element';
import { type Store } from '../lib/store';

import { Logger } from './logger';

const logger = new Logger('HMR');

const nativeDefineElement = window.customElements.define.bind(window.customElements);

function updateElements(name: string) {
  const temp: Element[] = [document.documentElement];
  while (!!temp.length) {
    const element = temp.pop()!;
    if (element.tagName.toLowerCase() === name) {
      // update style
      element.after(element);

      // re render
      (element as any)[UpdateToken]?.();
    }
    temp.push(...[...element.children, ...(element.shadowRoot?.children || [])].reverse());
  }
}

function getMetadata(cons: any): Metadata {
  return (cons as any)[Symbol.metadata] || {};
}

function stringifyStores(stores?: Store<any>[]) {
  return JSON.stringify(
    stores?.map((store) => JSON.stringify({ ...store }, (_, v) => (typeof v === 'function' ? v.toString() : v))),
  );
}

function getHmrMethodKeys(cons: CustomElementConstructor) {
  return Object.getOwnPropertyNames(cons.prototype).filter((key) => key.startsWith('_hmr_'));
}

function checkNeedReload(existed: CustomElementConstructor, newClass: CustomElementConstructor) {
  const { mode, penetrable, noBlocking, aria, observedStores } = getMetadata(existed);
  const newMetadata = getMetadata(newClass);
  if (
    mode !== newMetadata.mode ||
    penetrable !== newMetadata.penetrable ||
    noBlocking !== newMetadata.noBlocking ||
    JSON.stringify(aria) !== JSON.stringify(newMetadata.aria) ||
    stringifyStores(observedStores) !== stringifyStores(newMetadata.observedStores) ||
    getHmrMethodKeys(existed).join() !== getHmrMethodKeys(newClass).join()
  ) {
    return true;
  }
}

window.customElements.define = (...rest: Parameters<typeof customElements.define>) => {
  const [name, newClass] = rest;
  const existed = customElements.get(name);

  if (!existed) {
    nativeDefineElement(...rest);
    return;
  }

  logger.info(`<${name}> update,`, { newClass });

  if (checkNeedReload(existed, newClass)) {
    location.reload();
    return;
  }

  const oldMetadata = getMetadata(existed);
  const newMetadata = getMetadata(newClass);

  if (oldMetadata.adoptedStyleSheets) {
    oldMetadata.adoptedStyleSheets.length = 0;
    oldMetadata.adoptedStyleSheets.push(...(newMetadata.adoptedStyleSheets || []));
  }

  oldMetadata.observedStores?.forEach((store, index) => {
    cleanObject(store);
    Object.assign(store, newMetadata.observedStores![index]);
  });

  Object.assign(
    existed.prototype,
    Object.fromEntries(
      getHmrMethodKeys(newClass)
        .filter((key) => existed.prototype[key].toString() !== newClass.prototype[key].toString())
        .map((key) => [key, newClass.prototype[key]]),
    ),
  );

  updateElements(name);
};
