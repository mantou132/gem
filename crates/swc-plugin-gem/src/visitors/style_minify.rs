//! Whitespace minification for Gem's CSS templates.
//!
//! Only static template segments are rewritten; interpolation values and their
//! binding positions are retained. These scanners track lexical context rather
//! than parsing full CSS.

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

/// Minify `css`/`styled` tagged templates.
/// Also handle template-valued properties in inline `css({...})` and
/// `styleMap({...})` calls; ordinary object strings are left alone.
pub fn style_minify_transform() -> impl VisitMut {
    TransformVisitor::default()
}

#[cfg(test)]
mod tests {
    #[test]
    fn should_parse_style_minify_config() {}
}
