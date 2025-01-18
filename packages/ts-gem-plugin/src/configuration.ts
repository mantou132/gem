import { camelToKebabCase } from '@mantou/gem/lib/utils';
import type { VSCodeEmmetConfig } from '@mantou/vscode-emmet-helper';

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
