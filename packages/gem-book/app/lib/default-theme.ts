export const defaultTheme = {
  font: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica Neue,sans-serif',
  codeFont:
    'Source Code Pro, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',

  sidebarWidthSmall: '270px',

  sidebarWidth: '304px',
  maxMainWidth: '52rem',
  headerHeight: '56px',
  normalRound: '0.5rem',
  smallRound: '0.25rem',

  // 深色主题设置为 `dark`，滚动条、表单控件和代码高亮使用深色
  colorScheme: 'light',
  backgroundColor: 'white',
  borderColor: '#eaeaea',
  textColor: 'rgb(40, 44, 52)',
  primaryColor: 'rgb(38, 192, 227)',
  noteColor: 'rgb(9, 105, 218)',
  tipColor: 'rgb(26, 127, 55)',
  importantColor: 'rgb(130, 80, 223)',
  warningColor: 'rgb(154, 103, 0)',
  cautionColor: 'rgb(209, 36, 47)',
};

/** 主题的 CSS 变量名，例如 `textColor` => `--gem-book-text-color` */
export const toThemeProp = (key: string) => `--gem-book-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
