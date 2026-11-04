# `<tap-pat-picker>`

可搜索、带字母索引的单选列表页，交互参考 iOS 设置中的“地区”选择。适合国家/地区、城市、语言等长列表。

选择后只发出 `change`，进入下一级或关闭由调用方处理。放在 `Sheet.open({ hasStack: true })` 中即可逐级选择。

## Example

<gbp-example name="tap-pat-picker" src="https://esm.sh/@mantou/tap-ui/patterns/picker">

```json
[
  {
    "style": "width: 100%; height: 400px",
    "searchable": true,
    "indexed": true,
    "value": "Banana",
    "items": [
      { "label": "Apple" },
      { "label": "Banana" },
      { "label": "Cherry" },
      { "label": "Durian" },
      { "label": "Grape" },
      { "label": "Mango" },
      { "label": "Orange" },
      { "label": "Peach" }
    ],
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## 国家或地区

`getRegionItems` 使用 `Intl.DisplayNames` 生成当前语言的名称和国旗，可按代码和英文名搜索；中文下按拼音首字母分组。

```ts
import { html } from '@mantou/gem/lib/element';
import { Sheet } from '@mantou/tap-ui/elements/sheet';
import { getCurrentRegion, getRegionItems } from '@mantou/tap-ui/lib/region';

import '@mantou/tap-ui/patterns/picker';

const { sheet } = Sheet.open({
  hasStack: true,
  snap: [0.9],
  body: html`
    <tap-pat-picker
      heading="国家或地区"
      searchable
      indexed
      pinned-heading="当前地区"
      value=${region}
      .items=${getRegionItems()}
      .pinned=${getRegionItems([getCurrentRegion()])}
      @change=${(evt) => {
        region = evt.detail;
        sheet.close(null);
      }}
    ></tap-pat-picker>
  `,
});
```

## 逐级选择

有下一级的条目设置 `action: true`，选择后在当前 stack 中推入下一级；数据由业务方提供。

```ts
import { Stack } from '@mantou/tap-ui/elements/stack';

const page = (parent, back) => html`
  <tap-pat-picker
    heading=${parent}
    ?back=${back}
    .items=${areas[parent].map((label) => ({ label, action: !!areas[label] }))}
    @change=${(evt) => {
      if (areas[evt.detail]) {
        Stack.getClosestStack(evt.target)?.push({ content: page(evt.detail, true) });
      } else {
        sheet.close(null);
      }
    }}
  ></tap-pat-picker>
`;

const { sheet } = Sheet.open({ hasStack: true, snap: [0.9], body: page('中国', false) });
```

## API

<gbp-api name="tap-pat-picker" src="/src/patterns/picker.ts"></gbp-api>
