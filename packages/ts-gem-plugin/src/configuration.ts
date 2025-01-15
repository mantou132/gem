import type { Logger } from '@mantou/typescript-template-language-service-decorator';
import type { VSCodeEmmetConfig } from '@mantou/vscode-emmet-helper';
import type { LanguageService } from 'typescript';
import type * as ts from 'typescript/lib/tsserverlibrary';
import { camelToKebabCase } from '@mantou/gem/lib/utils';

export interface PluginConfiguration {
  emmet: VSCodeEmmetConfig;
  elementDefineRules: Record<string, string>;
}

const defaultConfiguration: PluginConfiguration = {
  emmet: {},
  elementDefineRules: {
    'Duoyun*Element': 'dy-*',
    '*Element': '*',
  },
};

// 类似自动导入
class Rules {
  #map = new Map<RegExp, string>();
  constructor(data: PluginConfiguration['elementDefineRules']) {
    Object.entries(data).forEach(([classNamePattern, tagPattern]) => {
      this.#map.set(new RegExp(classNamePattern.replace('*', '(.*)')), tagPattern.replace('*', '$1'));
    });
  }

  findTag(className: string) {
    for (const [reg, replaceStr] of this.#map) {
      if (reg.exec(className)) {
        return camelToKebabCase(className.replace(reg, replaceStr));
      }
    }
  }
}

export class Configuration {
  #emmet = defaultConfiguration.emmet;
  #elementDefineRules = new Rules(defaultConfiguration.elementDefineRules);

  update(config: any) {
    this.#emmet = config.emmet || defaultConfiguration.emmet;
    this.#elementDefineRules = new Rules({
      ...defaultConfiguration.elementDefineRules,
      ...config.elementDefineRules,
    });
  }

  get emmet() {
    return this.#emmet;
  }

  get elementDefineRules() {
    return this.#elementDefineRules;
  }
}

export class Store<T extends WeakKey> {
  #map = new Map<string, WeakRef<T>>();
  #weakMap = new WeakMap<T, string>();
  #registry = new FinalizationRegistry<string>((key) => this.#map.delete(key));

  set(key: string, val: T) {
    this.#map.set(key, new WeakRef(val));
    this.#weakMap.set(val, key);
    this.#registry.register(val, key);
  }

  get(key: string) {
    return this.#map.get(key)?.deref();
  }

  findKey(val: T) {
    return this.#weakMap.get(val);
  }

  *[Symbol.iterator]() {
    const entries = this.#map.entries();
    for (const [tag, ref] of entries) {
      yield [tag, ref.deref()!] as const;
    }
  }
}

export type Context = {
  config: Configuration;
  ts: typeof ts;
  logger: Logger;
  getProgram: LanguageService['getProgram'];
  getProject: () => ts.server.Project;
  elements: Store<ts.ClassDeclaration>;
};
