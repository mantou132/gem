// @ts-nocheck
const style = css`
  &{
    color: red;
  }
  :is(&.active,:host(.active)) {
    color: green;
  }
  :is(&:hover,:host(:hover)){
    color: green;
  }
  :is(&:not(.a, .b),:host(:not(.a, .b))) {
    color: yellow;
  }
  :is(&[data-x="a b"],:host([data-x="a b"])) {
    color: blue;
  }
  :is(&:is(.a, .b):where(:hover, :focus),:host(:is(.a, .b):where(:hover, :focus))) {
    color: purple;
  }
`
