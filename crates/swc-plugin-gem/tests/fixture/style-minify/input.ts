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
const style3 = css`
  :scope {
    border: 1px solid ${' red'};
  }
`
const style4 = css`
  :scope {
    border: ${'1px'} solid ${' red'};
  }
`
const style5 = css`
  :scope {
    content: "a  b";
    content: "/* not a comment */";
  }
`
const style6 = css`
  @media screen and (min-width: ${'768px'}) {
    :scope {
      color: red;
    }
  }
`
const style7 = css`
  @media ${'screen'} and (min-width: 768px) {
    :scope {
      color: blue;
    }
  }
`
const style8 = css`
  @media screen and (${ 'prefers-color-scheme: dark'}) {
    :scope {
      color: white;
    }
  }
`
const style9 = css`
  :scope {
    content: "a  b ${'x'} c  d";
  }
`
const highlightStyle = styleMap({
  top: `calc(${4} * ${'24px'} + ${'1em'})`,
  bottom: `calc(${9} * ${'24px'} - ${'1em'})`,
})

const boundaryStyles = css`
  ${'.parent'} .child { margin: ${'1px'} ${'2px'}; }
  ${'.parent'} :hover { color: red; }
  & :focus { color: blue; }
  [data-active] ${'.child'} { color: green; }
  ${'.parent'} [data-active] { color: green; }
  :scope { font-family: "Open Sans" ${'serif'}; }
`
const plainText = {
  message: `  Hello,  ${'world'}!  `,
  nested: { text: `a  b` },
};

// At-rules, nesting, selector lists, and animation selectors.
const conditionalStyles = css`
  @layer components {
    @supports (display: grid) and (not (display: subgrid)) {
      @container card (width > 30rem) {
        :is(.card, .panel) > [data-label="a, b"] {
          display: grid;
        }
      }
    }
  }
  @keyframes fade {
    from { opacity: 0; }
    50%, to { opacity: 1; }
  }
`
// Function arguments, custom-property fallbacks, and slash-separated values.
const valueStyles = css`
  :scope {
    --gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--gap, 0.5rem);
    width: clamp(10rem, calc(100% / 2), 40rem);
    color: rgb(from var(--accent, #123456) r g b / 0.5);
    font: 16px / 1.5 system-ui;
    background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text>a  b</text></svg>");
  }
`
// CSS escapes inside strings must survive both scanning and JS emission.
const escapedStyles = styled`
  ::before {
    content: "\\2192  next";
  }
  ::after {
    content: 'C:\\\\tmp';
  }
`
