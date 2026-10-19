import { GemElement } from '@mantou/gem';
import { page } from '@mantou/gemkit';

/**
 * 给 LLM 的文件，构建后由 CLI 从页面的数据文件 `<lang>/llms/__data.json` 输出成
 * `llms.txt`、`llms-full.txt` 和每个页面的 `.md`，页面本身不显示内容
 */
@page('LLMs')
export default class LlmsPage extends GemElement {}
