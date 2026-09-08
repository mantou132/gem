//! Whitespace minification for Gem's CSS and lit-html-style templates.
//!
//! Only static template segments are rewritten; interpolation values and their
//! binding positions are retained. Nested templates are visited independently.
//! These scanners track lexical context rather than parsing full CSS or HTML.

use swc_common::DUMMY_SP;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::{CallExpr, Callee, Prop, PropOrSpread, TaggedTpl, Tpl, TplElement};

/// Preserve separators near unknown interpolation values, including the spaces
/// required by `calc()` operators and descendant selectors.
fn should_keep_expr_boundary_space(ch: char) -> bool {
    ch.is_alphanumeric()
        || matches!(
            ch,
            '+' | '-'
                | '_'
                | '%'
                | ')'
                | '('
                | ':'
                | ']'
                | '['
                | '.'
                | '#'
                | '&'
                | '*'
                | '\''
                | '"'
                | '\\'
        )
}

fn should_insert_css_space(prev: char, next: char) -> bool {
    if matches!(prev, '{' | '}' | ':' | ';' | ',' | '(') {
        return false;
    }
    if matches!(next, '{' | '}' | ';' | ',' | ')') {
        return false;
    }
    true
}

#[derive(Clone, Copy, Default)]
struct CssQuasiState {
    in_comment: bool,
    in_single_quote: bool,
    in_double_quote: bool,
    escaped: bool,
}

impl CssQuasiState {
    fn in_string(self) -> bool {
        self.in_single_quote || self.in_double_quote
    }
}

fn minify_css_quasi(raw: &str, mut state: CssQuasiState) -> (String, CssQuasiState) {
    let mut out = String::with_capacity(raw.len());
    let chars: Vec<char> = raw.chars().collect();
    let mut i = 0;
    let mut pending_space = false;

    while i < chars.len() {
        let ch = chars[i];
        let next = chars.get(i + 1).copied();

        if state.in_comment {
            if ch == '*' && next == Some('/') {
                state.in_comment = false;
                i += 2;
            } else {
                i += 1;
            }
            continue;
        }

        if state.in_single_quote || state.in_double_quote {
            out.push(ch);
            if state.escaped {
                state.escaped = false;
            } else if ch == '\\' {
                state.escaped = true;
            } else if (state.in_single_quote && ch == '\'') || (state.in_double_quote && ch == '"')
            {
                state.in_single_quote = false;
                state.in_double_quote = false;
            }
            i += 1;
            continue;
        }

        if ch == '/' && next == Some('*') {
            state.in_comment = true;
            i += 2;
            continue;
        }

        if ch == '\'' {
            if pending_space {
                if let Some(prev) = out.chars().last() {
                    if should_insert_css_space(prev, ch) {
                        out.push(' ');
                    }
                }
                pending_space = false;
            }
            state.in_single_quote = true;
            out.push(ch);
            i += 1;
            continue;
        }

        if ch == '"' {
            if pending_space {
                if let Some(prev) = out.chars().last() {
                    if should_insert_css_space(prev, ch) {
                        out.push(' ');
                    }
                }
                pending_space = false;
            }
            state.in_double_quote = true;
            out.push(ch);
            i += 1;
            continue;
        }

        if ch.is_whitespace() {
            pending_space = true;
            i += 1;
            continue;
        }

        if pending_space {
            if let Some(prev) = out.chars().last() {
                if should_insert_css_space(prev, ch) {
                    out.push(' ');
                }
            }
            pending_space = false;
        }

        out.push(ch);
        i += 1;
    }

    (out, state)
}

/// Remove CSS comments and redundant whitespace outside quoted strings.
///
/// Quote/comment state carries across interpolations. Existing separators are
/// retained where removing them could join values or selectors, e.g.
/// `${width} ${height}`, `${parent} .child`, and `calc(${x} + ${y})`.
fn minify_css_style_tpl(tpl: &Tpl) -> Tpl {
    let last_quasi_idx = tpl.quasis.len().saturating_sub(1);
    let mut state = CssQuasiState::default();
    let quasis = tpl
        .quasis
        .iter()
        .enumerate()
        .map(|(idx, quasi)| {
            let raw = quasi.raw.as_str();
            let state_at_start = state;
            let (mut removed_space, state_at_end) = minify_css_quasi(raw, state);
            state = state_at_end;

            // Whitespace between two expressions can separate CSS tokens.
            if idx > 0
                && idx < last_quasi_idx
                && !raw.is_empty()
                && raw.chars().all(char::is_whitespace)
                && !state.in_string()
            {
                return TplElement {
                    span: DUMMY_SP,
                    tail: quasi.tail,
                    cooked: None,
                    raw: " ".into(),
                };
            }

            if !state_at_start.in_string() {
                let keep_head_space = idx > 0
                    && raw.chars().next().is_some_and(char::is_whitespace)
                    && removed_space
                        .trim_start()
                        .chars()
                        .next()
                        .is_some_and(should_keep_expr_boundary_space);
                if keep_head_space && !removed_space.starts_with(char::is_whitespace) {
                    removed_space.insert(0, ' ');
                }
                if !keep_head_space {
                    removed_space = removed_space.trim_start().to_string();
                }
            }

            if !state_at_end.in_string() {
                let keep_tail_space = idx < last_quasi_idx
                    && raw.chars().last().is_some_and(char::is_whitespace)
                    && removed_space
                        .trim_end()
                        .chars()
                        .last()
                        .is_some_and(should_keep_expr_boundary_space);
                if keep_tail_space && !removed_space.ends_with(char::is_whitespace) {
                    removed_space.push(' ');
                }
                if !keep_tail_space {
                    removed_space = removed_space.trim_end().to_string();
                }
            }

            TplElement {
                span: DUMMY_SP,
                tail: quasi.tail,
                cooked: None,
                raw: removed_space.into(),
            }
        })
        .collect();

    Tpl {
        span: DUMMY_SP,
        exprs: tpl.exprs.clone(),
        quasis,
    }
}

#[derive(Default)]
struct HtmlState {
    in_comment: bool,
    in_cdata: bool,
    in_tag: bool,
    quote: Option<char>,
    tag_name: String,
    closing_tag: bool,
    raw_text_tag: Option<String>,
    preserve_whitespace_depth: usize,
}

/// Apply JSX-style whitespace rules to a single ordinary text segment.
///
/// Remove blank lines and line-edge indentation, join nonempty lines with one
/// space, and replace tabs with spaces. Same-line spaces remain explicit.
/// Tags, comments, and interpolations delimit segments, so `Hello\nworld`
/// becomes `Hello world`, but `Hello\n${name}` becomes `Hello${name}`.
fn minify_html_text(text: &str) -> String {
    let lines: Vec<_> = text.split(['\r', '\n']).collect();
    let last_non_empty = lines
        .iter()
        .rposition(|line| line.chars().any(|ch| !matches!(ch, ' ' | '\t')))
        .unwrap_or(0);
    let mut out = String::with_capacity(text.len());
    for (index, line) in lines.iter().enumerate() {
        let line = line.replace('\t', " ");
        let line = if index == 0 {
            line.as_str()
        } else {
            line.trim_start_matches(' ')
        };
        let line = if index + 1 == lines.len() {
            line
        } else {
            line.trim_end_matches(' ')
        };
        if !line.is_empty() {
            out.push_str(line);
            if index != last_non_empty {
                out.push(' ');
            }
        }
    }
    out
}

fn flush_html_text(text: &mut String, out: &mut String) {
    if !text.is_empty() {
        out.push_str(&minify_html_text(text));
        text.clear();
    }
}

fn minify_html_quasi(raw: &str, state: &mut HtmlState) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut offset = 0;
    let mut text = String::new();
    while offset < raw.len() {
        let rest = &raw[offset..];
        let ch = rest.chars().next().unwrap();

        if state.in_comment || state.in_cdata {
            let end = if state.in_comment { "-->" } else { "]]>" };
            if rest.starts_with(end) {
                out.push_str(end);
                offset += end.len();
                state.in_comment = false;
                state.in_cdata = false;
            } else {
                out.push(ch);
                offset += ch.len_utf8();
            }
            continue;
        }

        if state.in_tag {
            if let Some(quote) = state.quote {
                out.push(ch);
                if ch == quote {
                    state.quote = None;
                }
            } else if matches!(ch, '\'' | '"') {
                state.quote = Some(ch);
                out.push(ch);
            } else if ch == '>' {
                out.push(ch);
                state.in_tag = false;
                if matches!(state.tag_name.as_str(), "pre" | "text") {
                    if state.closing_tag {
                        state.preserve_whitespace_depth =
                            state.preserve_whitespace_depth.saturating_sub(1);
                    } else if state.tag_name == "pre" || !out.ends_with("/>") {
                        state.preserve_whitespace_depth += 1;
                    }
                }
                if state.closing_tag {
                    state.raw_text_tag = None;
                } else if matches!(
                    state.tag_name.as_str(),
                    "script" | "style" | "textarea" | "title"
                ) {
                    state.raw_text_tag = Some(state.tag_name.clone());
                }
            } else if ch.is_ascii_whitespace() {
                // Keep the separator even at expression boundaries (element bindings).
                if !out.ends_with(' ') {
                    out.push(' ');
                }
            } else {
                out.push(ch);
            }
            offset += ch.len_utf8();
            continue;
        }

        if let Some(tag) = &state.raw_text_tag {
            let end = tag.len() + 2;
            let is_end = rest.starts_with("</")
                && rest
                    .get(2..end)
                    .is_some_and(|name| name.eq_ignore_ascii_case(tag))
                && rest[end..]
                    .chars()
                    .next()
                    .is_some_and(|c| c.is_ascii_whitespace() || matches!(c, '>' | '/'));
            if !is_end {
                out.push(ch);
                offset += ch.len_utf8();
                continue;
            }
        }

        if rest.starts_with("<!--") {
            flush_html_text(&mut text, &mut out);
            if let Some(end) = rest.find("-->") {
                // Removing a comment that contains an expression would turn a
                // lit-html comment binding into a rendered child binding.
                offset += end + 3;
            } else {
                out.push_str("<!--");
                offset += 4;
                state.in_comment = true;
            }
            continue;
        }
        if rest.starts_with("<![CDATA[") {
            flush_html_text(&mut text, &mut out);
            out.push_str("<![CDATA[");
            offset += 9;
            state.in_cdata = true;
            continue;
        }

        if ch == '<' {
            let prefix_len = if rest.starts_with("</") { 2 } else { 1 };
            let name: String = rest[prefix_len..]
                .chars()
                .take_while(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | ':'))
                .collect();
            if name.starts_with(|c: char| c.is_ascii_alphabetic()) {
                flush_html_text(&mut text, &mut out);
                state.in_tag = true;
                state.closing_tag = prefix_len == 2;
                state.tag_name = name.to_ascii_lowercase();
                out.push_str(&rest[..prefix_len + name.len()]);
                offset += prefix_len + name.len();
                continue;
            }
        }

        if state.preserve_whitespace_depth == 0 {
            text.push(ch);
        } else {
            out.push(ch);
        }
        offset += ch.len_utf8();
    }
    flush_html_text(&mut text, &mut out);
    out
}

/// Minify HTML while keeping lit-html attribute/element binding boundaries.
///
/// Collapse unquoted whitespace inside tags and remove complete static comments.
/// Preserve quoted attributes, comments spanning interpolations, CDATA, and text
/// inside `pre`, SVG `text`, `script`, `style`, `textarea`, and `title`.
/// Ordinary text uses JSX-style whitespace rules; CSS `white-space` is not
/// inspected. Supply intentionally formatted ordinary text through `${...}`.
fn minify_html_tpl(tpl: &Tpl) -> Tpl {
    let mut state = HtmlState::default();
    Tpl {
        span: DUMMY_SP,
        exprs: tpl.exprs.clone(),
        quasis: tpl
            .quasis
            .iter()
            .map(|x| TplElement {
                span: DUMMY_SP,
                tail: x.tail,
                cooked: None,
                raw: minify_html_quasi(x.raw.as_str(), &mut state).into(),
            })
            .collect(),
    }
}

#[derive(Default)]
struct TransformVisitor {}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_tagged_tpl(&mut self, node: &mut TaggedTpl) {
        node.visit_mut_children_with(self);

        if let Some(ident) = node.tag.as_ident() {
            let tag_fn = ident.sym.as_str();
            if tag_fn == "css" || tag_fn == "styled" {
                *node.tpl = minify_css_style_tpl(&node.tpl);
            }
            if matches!(tag_fn, "html" | "raw" | "svg" | "mathml") {
                *node.tpl = minify_html_tpl(&node.tpl);
            }
        }
    }

    fn visit_mut_call_expr(&mut self, node: &mut CallExpr) {
        node.visit_mut_children_with(self);

        if let Callee::Expr(expr) = &node.callee {
            if let Some(ident) = expr.as_ident() {
                if matches!(ident.sym.as_str(), "css" | "styleMap") {
                    if let Some(object) = node
                        .args
                        .first_mut()
                        .and_then(|arg| arg.expr.as_mut_object())
                    {
                        for prop in &mut object.props {
                            if let PropOrSpread::Prop(prop) = prop {
                                if let Prop::KeyValue(prop) = &mut **prop {
                                    if let Some(tpl) = prop.value.as_tpl() {
                                        prop.value = minify_css_style_tpl(tpl).into();
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Minify `css`/`styled` and `html`/`raw`/`svg`/`mathml` tagged templates.
/// Also handle template-valued properties in inline `css({...})` and
/// `styleMap({...})` calls; ordinary object strings are left alone.
pub fn minify_transform() -> impl VisitMut {
    TransformVisitor::default()
}

#[cfg(test)]
mod tests {
    use super::minify_html_text;

    #[test]
    fn should_handle_jsx_text_line_endings() {
        for (input, expected) in [
            ("\r\n\tHello\r\n\r\n\tworld\r\n", "Hello world"),
            ("Hello\rworld", "Hello world"),
            ("Hello\t\tworld", "Hello  world"),
            ("\n  \u{a0}  \n", "\u{a0}"),
            ("\r\n \t\r\n", ""),
        ] {
            assert_eq!(minify_html_text(input), expected, "{input:?}");
        }
    }
}
