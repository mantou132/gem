import type { Logger } from '@mantou/typescript-template-language-service-decorator';
import type { LanguageService } from 'typescript';
import type * as ts from 'typescript/lib/tsserverlibrary';

interface FormatConfig {
  readonly enabled: boolean;
}

interface PluginConfiguration {
  readonly emmet: any;
  readonly tags: ReadonlyArray<string>;
  readonly format: FormatConfig;
}

const defaultConfiguration: PluginConfiguration = {
  emmet: {},
  tags: ['html', 'raw'],
  format: {
    enabled: true,
  },
};

export class Configuration {
  #emmet = defaultConfiguration.emmet;
  #format = defaultConfiguration.format;
  #tags = defaultConfiguration.tags;

  update(config: any) {
    this.#format = Object.assign({}, defaultConfiguration.format, config.format || {});
    this.#tags = config.tags || defaultConfiguration.tags;
  }

  get emmet() {
    return this.#emmet;
  }

  get format() {
    return this.#format;
  }

  get tags() {
    return this.#tags;
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
