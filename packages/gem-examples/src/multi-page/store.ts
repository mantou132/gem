import { useStore } from '@mantou/gem';

export const [pageA, updatePageA] = useStore({
  text: 'this is page A',
});

export const [pageB, updatePageB] = useStore({
  text: 'this is page B',
});
