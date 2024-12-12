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