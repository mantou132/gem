import type { VSCodeEmmetConfig } from '@mantou/vscode-emmet-helper';

/** 和 ts-gem-plugin 的配置一致 */
export interface GemConfiguration {
  /** 编写标准的自定义元素，部分建议变成警告 */
  strict: boolean;
  emmet: VSCodeEmmetConfig;
  /** 依赖中的声明文件没有装饰器，根据类名推断标签名 */
  elementDefineRules: Record<string, string>;
}

export const defaultConfiguration: GemConfiguration = {
  strict: false,
  emmet: {},
  elementDefineRules: {},
};
