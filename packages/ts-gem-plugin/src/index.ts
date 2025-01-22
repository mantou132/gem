import { decorateWithTemplateLanguageService } from '@mantou/typescript-template-language-service-decorator';
import type { Logger } from '@mantou/typescript-template-language-service-decorator';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { Configuration } from './configuration';
import { Context } from './context';
import { CSSLanguageService } from './decorate-css';
import { HTMLLanguageService } from './decorate-html';
import { decorateLanguageService } from './decorate-ts';
import { decorate } from './utils';
import { NAME } from './constants';

class LanguageServiceLogger implements Logger {
  #info: ts.server.PluginCreateInfo;
  constructor(info: ts.server.PluginCreateInfo) {
    this.#info = info;
  }

  log(msg: string) {
    this.#info.project.projectService.logger.info(`[${NAME}] ${msg}`);
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
      logger.log('Starting...');
      this.#config.update(info.config);

      const context = new Context(this.#ts, this.#config, info, logger);

      const decoratedService = decorateLanguageService(context, info.languageService);

      const decoratedService1 = decorateWithTemplateLanguageService(
        this.#ts,
        decoratedService,
        info.project,
        new CSSLanguageService(context),
        context.cssTemplateStringSettings,
        { logger },
      );

      return decorateWithTemplateLanguageService(
        this.#ts,
        decoratedService1,
        info.project,
        new HTMLLanguageService(context),
        context.htmlTemplateStringSettings,
        { logger },
      );
    });
  }

  onConfigurationChanged(config: any) {
    this.#config.update(config);
  }
}

export = (mod: { typescript: typeof ts }) => new HtmlPlugin(mod.typescript);
