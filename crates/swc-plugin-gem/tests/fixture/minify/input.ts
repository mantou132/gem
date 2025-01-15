// @ts-nocheck
const style = css`
  :host {
    /*
     * comment1
     */
    color: ${' red'};
    /* comment2 */
  }
`
const style2 = css({
  $: `
    color: ${' red'};
  `
})
const template = html`
  <div>
    <!--
      Line
      测试
    -->
    content
    <!--1211-->
    <span>${'test'}</span>
  </div>
`
