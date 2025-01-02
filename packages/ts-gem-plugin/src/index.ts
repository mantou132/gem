import type { Logger } from 'typescript-template-language-service-decorator';
import type * as ts from 'typescript/lib/tsserverlibrary';
import { decorateWithTemplateLanguageService } from 'typescript-template-language-service-decorator';

import { EchoTemplateLanguageService } from './template-language-service';
import type { Context } from './decorate-language-service';
import { decorateLanguageService } from './decorate-language-service';
import { Utils, decorate } from './utils';

class LanguageServiceLogger implements Logger {
  #info: ts.server.PluginCreateInfo;
  constructor(info: ts.server.PluginCreateInfo) {
    this.#info = info;
  }

  log(msg: string) {
    this.#info.project.projectService.logger.info(`[gem] ${msg}`);
  }
}

class HtmlPlugin {
  #ts: typeof ts;
  constructor(typescript: typeof ts) {
    this.#ts = typescript;
  }

  create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    return decorate(info.languageService, () => {
      const logger = new LanguageServiceLogger(info);
      logger.log('Starting ts-gem-plugin...');

      const context: Context = {
        ts: this.#ts,
        utils: new Utils(this.#ts),
        logger,
        getProgram: () => {
          return info.languageService.getProgram()!;
        },
        getProject: () => {
          return info.project;
        },
      };

      // hack ts 来收集自定义元素信息？

      const decoratedService = decorateLanguageService(info.languageService, context);

      return decorateWithTemplateLanguageService(
        this.#ts,
        decoratedService,
        info.project,
        new EchoTemplateLanguageService(context),
        { tags: ['html'], enableForStringWithSubstitutions: true },
        { logger },
      );
    });
  }

  onConfigurationChanged(_config: any) {
    // this._config.update(config);
  }
}

export = (mod: { typescript: typeof ts }) => new HtmlPlugin(mod.typescript);
