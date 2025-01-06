import type { Logger } from 'typescript-template-language-service-decorator';
import type * as ts from 'typescript/lib/tsserverlibrary';
import { decorateWithTemplateLanguageService } from 'typescript-template-language-service-decorator';

import { HTMLLanguageService } from './decorate-html';
import type { Context } from './decorate-ts';
import { decorateLanguageService } from './decorate-ts';
import { Utils, decorate, getSubstitution } from './utils';
import { Configuration } from './configuration';
import { CSSLanguageService } from './decorate-css';

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
  #config = new Configuration();

  constructor(typescript: typeof ts) {
    this.#ts = typescript;
  }

  create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    return decorate(info.languageService, () => {
      const logger = new LanguageServiceLogger(info);
      logger.log('Starting ts-gem-plugin...');
      this.#config.update(info.config);

      const context: Context = {
        config: this.#config,
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

      const decoratedService1 = decorateWithTemplateLanguageService(
        this.#ts,
        decoratedService,
        info.project,
        new CSSLanguageService(context),
        {
          tags: ['styled', 'css'],
          enableForStringWithSubstitutions: true,
          getSubstitution,
        },
        { logger },
      );

      return decorateWithTemplateLanguageService(
        this.#ts,
        decoratedService1,
        info.project,
        new HTMLLanguageService(context),
        {
          tags: ['html', 'raw'],
          enableForStringWithSubstitutions: true,
          getSubstitution,
        },
        { logger },
      );
    });
  }

  onConfigurationChanged(config: any) {
    this.#config.update(config);
  }
}

export = (mod: { typescript: typeof ts }) => new HtmlPlugin(mod.typescript);
