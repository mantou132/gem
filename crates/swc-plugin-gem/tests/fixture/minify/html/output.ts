// @ts-nocheck
export const templates = (value, onClick, ref, items)=>[
        // Attribute, property, boolean, event, and element bindings.
        html`<button title="before ${value} >   < <!-- literal --> after" data-value=${value} .value=${value} ?disabled=${false} @click=${onClick} ${ref} >${value}</button>`,
        // Same-line spaces remain explicit; multiline indentation is removed.
        html`<span>a</span>   <span>b</span> ${value} <b>c</b>`,
        html`<pre><code>first</code>
    <code>${value}</code></pre>`,
        html`<div style="white-space: pre-wrap">${`first
    second   third`}</div>`,
        // Multiline text joins with a space; tag/expression boundaries do not add one.
        html`<p>Hello world</p><p>Hello<b>world</b>!</p><p>Hello${value}!</p><p>Hello ${value} !</p><p>${value}${' '}${value}</p>`,
        // Raw-text/RCDATA elements can contain comment-like and tag-like text.
        html`<textarea><!-- literal --> >   < ${value} >   <</textarea>`,
        html`<title>before <!-- literal --> ${value} after</title>`,
        html`<style>
      .item::before {
        content: "<!-- literal --> >   <";
      }
    </style>`,
        html`<script type="application/json">
      {"text":"<!-- literal --> >   <"}
    </script>`,
        // Static comments can be removed; comments containing bindings must remain.
        html`<div>${value}<!-- keep ${value} hidden --><span>${value}</span></div>`,
        // Conditional/list templates and adjacent expressions retain their positions.
        html`<ul>${items.map((item)=>html`<li data-id=${item}>${item}</li>`)}</ul>${value ? html`<b>${value}</b>` : nothing}${value}`,
        // Gem's template extensions use the same attribute/element binding positions.
        html`<div v-if=${value} ${ref} ${{
            title: value
        }}>${value}</div><span v-else>empty</span>`,
        // SVG text whitespace and namespaced attributes.
        html`<svg><text xml:space="preserve"><tspan>a</tspan>   <tspan>${value}</tspan></text></svg>`,
        svg`<circle cx=${value} cy="10" r="5" ></circle>`,
        mathml`<mi mathvariant="normal" >${value}</mi>`
    ];
