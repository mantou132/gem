export const CSS_REG = /(?<start>\/\*\s*css\s*\*\/\s*`|(?<!`)(?:css|less|scss)\s*`)(?<content>.*?)(`(?=;|\s))/gis;
export const HTML_REG = /(?<start>\/\*\s*html\s*\*\/\s*`|(?<!`)(?:html|raw)\s*`)(?<content>[^`]*)(`)/gi;
export const STYLE_REG = /(?<start>\/\*\s*style\s*\*\/\s*`|(?<!`)styled?\s*`)(?<content>.*?)(`(?=,|\s*}\s*\)))/gis;
