; Gem support

(call_expression
  function: (identifier) @_name (#eq? @_name "css")
  arguments: (arguments (object (pair
    value: (template_string (string_fragment) @content
      (#set! "language" "css"))))))

(call_expression
  function: (identifier) @_name (#match? @_name "^styled(\\.\\w+)?$")
  arguments: (template_string (string_fragment) @content
                              (#set! "language" "css"))
)

((comment) @_css_comment
  (#match? @_css_comment "/[*]+\\s*(css|style)\\s*[*]+/")
  (template_string (string_fragment) @content
    (#set! "language" "css")))

((comment) @_html_comment
  (#match? @_html_comment "/[*]+\\s*html\\s*[*]+/")
  (template_string (string_fragment) @content
    (#set! "language" "html")))
