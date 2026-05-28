// @ts-nocheck
const style = css`
  &{
    color: red;
  }
  &.active {
    color: green;
  }
  &:hover{
    color: green;
  }
  &:not(.a, .b) {
    color: yellow;
  }
  &[data-x="a b"] {
    color: blue;
  }
  &:is(.a, .b):where(:hover, :focus) {
    color: purple;
  }
`
