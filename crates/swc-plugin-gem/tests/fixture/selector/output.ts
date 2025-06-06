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
`