// @ts-nocheck
const style = css`:host{color:${' red'};}`;
const style2 = css({
  $: `color:${' red'};`
});
const template = html`<div><span>${'test'}</span></div>
`
