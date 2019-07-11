import { updateStore } from '../../';
import store from './store';

export default {
  async getData() {
    const text = await new Promise<string>(res => setTimeout(() => res('pageA async data'), 1000));
    updateStore(store.pageA, { text });
  },
};
