; Gem support

; svg``
(call_expression
  function: (identifier) @_name (#eq? @_name "svg")
  arguments: (template_string) @injection.content
                              (#set! injection.language "html")
)

; mathml``
(call_expression
  function: (identifier) @_name (#eq? @_name "mathml")
  arguments: (template_string) @injection.content
                              (#set! injection.language "html")
)

; css({ h: `` })
(call_expression
  function: (identifier) @_name (#eq? @_name "css")
  arguments: (arguments (object (pair
    value: (template_string (string_fragment) @injection.content
      (#set! injection.language "css"))))))

; styled``
(call_expression
  function: (identifier) @_name (#match? @_name "^styled(\\.\\w+)?$")
  arguments: (template_string (string_fragment) @injection.content
                              (#set! injection.language "css"))
)

((comment) @_css_comment
  (#match? @_css_comment "/[*]+\\s*(css|style)\\s*[*]+/")
  (template_string (string_fragment) @injection.content
    (#set! injection.language "css")))

((comment) @_html_comment
  (#match? @_html_comment "/[*]+\\s*html\\s*[*]+/")
  (template_string (string_fragment) @injection.content
    (#set! injection.language "html")))
