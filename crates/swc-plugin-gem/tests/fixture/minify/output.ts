// @ts-nocheck
const style = css`:host{color:${' red'};}`;
const style2 = css({
    $: `color:${' red'};`
});
const style3 = css`:scope{border:1px solid ${' red'};}`;
const style4 = css`:scope{border:${'1px'} solid ${' red'};}`;
const style5 = css`:scope{content:"a  b";content:"/* not a comment */";}`;
const style6 = css`@media screen and (min-width:${'768px'}){:scope{color:red;}}`;
const style7 = css`@media ${'screen'} and (min-width:768px){:scope{color:blue;}}`;
const style8 = css`@media screen and (${'prefers-color-scheme: dark'}){:scope{color:white;}}`;
const style9 = css`:scope{content:"a  b ${'x'} c  d";}`;
const template = html`
  <div>
    
    content
    
    <span>${'test'}</span> </div>
`;
const template2 = html`<span>a</span> <span>b</span>`;
