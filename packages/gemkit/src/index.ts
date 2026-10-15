export { server } from '@mantou/gem-ssr/decorators';

export type { ServerLoadContext, ServerModule } from './data';
export { getBasePath, localizePath, splitLanguage } from './i18n';
export { defineElement, GemkitOutletElement, loadLayout, loadPage, setOutlets } from './outlet';
export { getPageOptions, type LayoutOptions, layout, type PageOptions, type Params, page } from './page';
export { formatTitle, type TitleOptions } from './title';
