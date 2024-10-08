import type { SupportLang } from '../common/config';
import type { GemBookElement } from '../element';

type Status = 'none' | 'partial';

const locales: Record<string, Record<Status, string>> = {
  en: {
    none: 'This document has not been translated',
    partial: 'This document is not translated',
  },
  zh: {
    none: '该文档还未翻译',
    partial: '该文档部分未翻译',
  },
} satisfies Record<SupportLang, unknown>;

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;
const { Gem, Utils, selfI18n } = GemBookPluginElement;
const { html, customElement, attribute, light } = Gem;

@customElement('gbp-trans-status')
@light({ penetrable: true })
class _GbpTransStatusElement extends GemBookPluginElement {
  @attribute status: Status;

  get #status() {
    return this.status || 'none';
  }

  render() {
    const langPkg = locales[GemBookPluginElement.lang || selfI18n.fallbackLanguage];
    return html`${Utils.parseMarkdown(`> [!WARNING]\n> ${langPkg[this.#status]}\n`)}`;
  }
}
