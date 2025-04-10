# `<dy-code-block>`

A component for displaying formatted code snippets with syntax highlighting. It supports line numbering, line highlighting, and range selection to focus on specific parts of the code.

## Example

<gbp-example
  name="dy-code-block"
  html='&amp;lt;html&amp;gt;
  &amp;lt;head&amp;gt;
    &amp;lt;title&amp;gt;Href Attribute Example&amp;lt;/title&amp;gt;
  &amp;lt;/head&amp;gt;
  &amp;lt;body&amp;gt;
    &amp;lt;h1&amp;gt;Href Attribute Example&amp;lt;/h1&amp;gt;
    &amp;lt;p&amp;gt;
      &amp;lt;a&amp;gt;The freeCodeCamp Contribution Page&amp;lt;/a&amp;gt; shows you how and where you can contribute to freeCodeCamps community and growth.
    &amp;lt;/p&amp;gt;
  &amp;lt;/body&amp;gt;
&amp;lt;/html&amp;gt;
Test'
  props='{"style": "width: 100%", "codelang": "html", "range": "-11", "highlight": "8"}'
  src="https://esm.sh/duoyun-ui/elements/code-block"></gbp-example>

## API

<gbp-api src="/src/elements/code-block.ts"></gbp-api>
