// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { GemElement } from '@mantou/gem';

import { getPageOptions, layout, page } from '../page';

type Post = { title: string };

const getPost = async (slug: string): Promise<Post> => ({ title: slug });

test('page: `params` 和 `data` 属性的类型需要和类型参数一致', ({ assert }) => {
  // `data` 的类型来自 `load`
  @page({ load: ({ params }) => getPost(params.slug) })
  class PostPage extends GemElement {
    params?: { slug: string };
    data?: Post;
  }

  // @ts-expect-error `data` 和 `load` 的返回值不一致
  @page({ load: ({ params }) => getPost(params.slug) })
  class WrongDataPage extends GemElement {
    data?: { name: string };
  }

  // @ts-expect-error `params` 和类型参数不一致
  @page<{ slug: string }>()
  class WrongParamsPage extends GemElement {
    params?: { id: string };
  }

  // 没有 `load` 也没有指定类型时不检查 `data`，例如数据来自服务端模块
  @page('Post')
  class ServerDataPage extends GemElement {
    data?: Post;
  }

  // @ts-expect-error layout 也检查
  @layout({ load: () => getPost('a') })
  class WrongLayout extends GemElement {
    data?: { name: string };
  }

  // 类型错误不影响运行时记录选项
  for (const cls of [PostPage, WrongDataPage, WrongParamsPage, ServerDataPage, WrongLayout]) {
    assert.equal(typeof getPageOptions(cls), 'object');
  }
  assert.equal(getPageOptions(ServerDataPage).title, 'Post');
});
