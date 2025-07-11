import { connect, createStore } from '@mantou/gem/lib/store';
import { camelToKebabCase } from '@mantou/gem/lib/utils';
import type { VSCodeEmmetConfig } from '@mantou/vscode-emmet-helper';

export interface PluginConfiguration {
  strict: boolean;
  emmet: VSCodeEmmetConfig;
  elementDefineRules: Record<string, string>;
}

const defaultConfiguration: PluginConfiguration = {
  strict: false,
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

const configurationStore = createStore({});

export function onConfigurationUpdate(fn: () => void) {
  return connect(configurationStore, fn);
}

export class Configuration implements Omit<PluginConfiguration, 'elementDefineRules'> {
  strict = defaultConfiguration.strict;
  emmet = defaultConfiguration.emmet;
  elementDefineRules = new Rules(defaultConfiguration.elementDefineRules);

  update({ update, ...config }: any) {
    // biome-ignore lint/plugin/assign: 批量赋值
    Object.assign(this, defaultConfiguration, config);
    this.elementDefineRules = new Rules({
      ...defaultConfiguration.elementDefineRules,
      ...config.elementDefineRules,
    });
    configurationStore();
  }
}
