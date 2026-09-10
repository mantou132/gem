//! Whitespace minification for Gem's lit-html-style templates.
//!
//! Only static template segments are rewritten; interpolation values and their
//! binding positions are retained. Nested templates are visited independently.
//! These scanners track lexical context rather than parsing full HTML.

use swc_common::DUMMY_SP;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::{TaggedTpl, Tpl, TplElement};

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
            if matches!(tag_fn, "html" | "raw" | "svg" | "mathml") {
                *node.tpl = minify_html_tpl(&node.tpl);
            }
        }
    }
}

/// Minify `html`/`raw`/`svg`/`mathml` tagged templates.
pub fn html_minify_transform() -> impl VisitMut {
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
