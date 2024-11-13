export const COLOR_REG = /(?<start>'|")?(?<content>#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4}))($1|\s*;)/g;

// 直接通过正则匹配 css 片段，通过条件的结束 ` 号匹配
export const CSS_REG = /(?<start>\/\*\s*css\s*\*\/\s*`|(?<!`)(?:css|less|scss)\s*`)(?<content>.*?)(`(?=;|,?\s*\)))/gs;
// 直接通过正则匹配 style 片段，通过条件的结束 ` 号匹配
// 语言服务和高亮都只支持 styled 写法
export const STYLE_REG = /(?<start>\/\*\s*style\s*\*\/\s*`|(?<!`)styled?\s*`)(?<content>.*?)(`(?=,|\s*}\s*\)))/gs;

// 处理后进行正则匹配，所以不需要验证后面的 ` 号
export const HTML_REG = /(?<start>\/\*\s*html\s*\*\/\s*`|(?<!`)(?:html|raw)\s*`)(?<content>[^`]*)(`)/g;

export const LANG_SELECTOR = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript'];
