import { customElement, numattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { aTimeout, expect, fixture } from '@mantou/gem/test/utils';

import { activeEffect, activityStore } from './decorators';

const logs: string[] = [];

@customElement('test-active-effect')
class TestActiveEffectElement extends GemElement {
  @numattribute count: number;

  @activeEffect((i) => [i.count])
  #run = ([count]: [number], old?: [number]) => {
    logs.push(`run ${count} ${old?.[0]}`);
    return () => logs.push(`clean ${count}`);
  };
}

it('runs only while not inside an inactive subtree', async () => {
  const wrapper: HTMLElement = await fixture(html`<div><test-active-effect count="1"></test-active-effect></div>`);
  const ele = wrapper.firstElementChild as TestActiveEffectElement;
  expect(logs).to.eql(['run 1 undefined']);

  ele.count = 2;
  await aTimeout();
  expect(logs).to.eql(['run 1 undefined', 'clean 1', 'run 2 1']);

  logs.length = 0;
  wrapper.dataset.inactive = '';
  activityStore();
  await aTimeout();
  expect(logs).to.eql(['clean 2']);

  // 不活动时依赖改变不执行
  ele.count = 3;
  await aTimeout();
  expect(logs).to.eql(['clean 2']);

  delete wrapper.dataset.inactive;
  activityStore();
  await aTimeout();
  expect(logs).to.eql(['clean 2', 'run 3 undefined']);

  logs.length = 0;
  wrapper.remove();
  expect(logs).to.eql(['clean 3']);
});
