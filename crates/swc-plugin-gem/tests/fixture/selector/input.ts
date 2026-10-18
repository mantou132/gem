// @ts-nocheck
const style = css`
  &{
    color: red;
  }
  &, & code, & gem-book-pre {
    background: red;
  }
  &.note, &.tip {
    color: blue;
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
  &::before {
    content: '#';
  }
  &::after, &::-webkit-details-marker {
    display: none;
  }
  &:hover::after {
    color: red;
  }
  &.open:not([data-x="a::b"])::part(icon):hover {
    color: blue;
  }
`
