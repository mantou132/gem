import { request } from '@mantou/gem/helper/request';
import type { PaginationRes } from 'duoyun-ui/helper/store';
import { Time } from 'duoyun-ui/lib/time';
import type { FetchEventDetail } from 'duoyun-ui/patterns/table';

const EXAMPLE = {
  id: 1,
  name: 'Leanne Graham',
  username: 'Bret',
  email: 'Sincere@april.biz',
  address: {
    street: 'Kulas Light',
    suite: 'Apt. 556',
    city: 'Gwenborough',
    zipcode: '92998-3874',
    geo: {
      lat: '-37.3159',
      lng: '81.1496',
    },
  },
  phone: '1-770-736-8031 x56442',
  website: 'hildegard.org',
  company: {
    name: 'Romaguera-Crona',
    catchPhrase: 'Multi-layered client-server neural-net',
    bs: 'harness real-time e-markets',
  },
  updated: 0,
};

export type Item = typeof EXAMPLE;

export async function fetchItemsWithArgs(args: FetchEventDetail): Promise<PaginationRes<Item>> {
  console.log('args:', args);
  const list: any[] = await request(`https://jsonplaceholder.typicode.com/users`);
  list.forEach((e, i) => {
    e.updated = new Time().subtract(i + 1, 'd').getTime();
    e.id += args.size * (args.page - 1);
  });
  return { list, count: 30 };
}

// 模拟真实 API
export async function fetchAllItems(): Promise<PaginationRes<Item>> {
  const list: any[] = await request(`https://jsonplaceholder.typicode.com/users`);
  list.forEach((e, i) => {
    e.updated = new Time().subtract(i + 1, 'd').getTime();
  });
  return { list, count: list.length * 3 };
}
