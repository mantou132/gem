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
