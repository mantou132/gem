# `<dy-radar-chart>`

雷达图（也称为蜘蛛图或星图）是一种以同一个中心点为起点，将三个或更多变量在放射轴上显示的二维图表，用于显示多变量数据。

## 示例

<gbp-example name="dy-radar-chart" src="https://esm.sh/duoyun-ui/elements/radar-chart">

```json
{
  "style": "width: 100%;",
  "aspectRatio": 3,
  "dimensions": [
    { "label": "销售", "max": 100 },
    { "label": "市场", "max": 100 },
    { "label": "研发", "max": 100 },
    { "label": "客服", "max": 100 },
    { "label": "行政", "max": 100 }
  ],
  "sequences": [
    {
      "label": "部门 A",
      "values": [90, 85, 70, 95, 60]
    },
    {
      "label": "部门 B",
      "values": [70, 95, 85, 65, 75]
    }
  ]
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/radar-chart.ts"></gbp-api>
