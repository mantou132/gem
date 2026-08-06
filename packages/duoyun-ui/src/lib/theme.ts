// 如果使用的元素直接依赖 tap ui，可能需要手动导入下该主题

import { theme } from 'tap-ui/lib/theme';

theme({
  controlShadow: '0 1px 2px #0000000d',
  cornerShape: 'round',
});

export * from 'tap-ui/lib/theme';
