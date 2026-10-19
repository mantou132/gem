import { GemElement } from '@mantou/gem';
import { page } from '@mantou/gemkit';

/**
 * 本地搜索的索引，使用页面的数据文件 `<lang>/search-index/__data.json` 输出，静态托管时也可以使用，
 * 页面本身不显示内容
 */
@page('Search Index')
export default class SearchIndexPage extends GemElement {}
