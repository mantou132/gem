import { hydrateStores } from '../client/store';
import { headerStore } from './stores';

// 在元素定义之前读取服务端的 store 值
hydrateStores({ header: headerStore });
