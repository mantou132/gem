use once_cell::sync::Lazy;
use regex::Regex;
use swc_common::DUMMY_SP;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::{Callee, KeyValueProp, TaggedTpl, Tpl, TplElement};

fn should_keep_expr_boundary_space(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '%' || ch == ')'
}

fn should_insert_css_space(prev: char, next: char) -> bool {
    if matches!(prev, '{' | '}' | ':' | ';' | ',' | '(') {
        return false;
    }
    if matches!(next, '{' | '}' | ':' | ';' | ',' | ')') {
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
            } else if (state.in_single_quote && ch == '\'')
                || (state.in_double_quote && ch == '"')
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

static TAG_BETWEEN_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)>\s+<").unwrap());
static TAG_COMMENT_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)<!--.*?-->").unwrap());

fn minify_html_tpl(tpl: &Tpl) -> Tpl {
    Tpl {
        span: DUMMY_SP,
        exprs: tpl.exprs.clone(),
        quasis: tpl
            .quasis
            .iter()
            .map(|x| {
                let removed_comment = TAG_COMMENT_REG.replace_all(x.raw.as_str(), "");
                let removed_between = TAG_BETWEEN_REG.replace_all(&removed_comment, "> <");
                TplElement {
                    span: DUMMY_SP,
                    tail: x.tail,
                    cooked: None,
                    raw: removed_between.into(),
                }
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
            if tag_fn == "html" || tag_fn == "raw" {
                *node.tpl = minify_html_tpl(&node.tpl);
            }
        }
    }

    fn visit_mut_callee(&mut self, node: &mut Callee) {
        if let Callee::Expr(expr) = &node {
            if let Some(ident) = expr.as_ident() {
                if ident.sym.as_str() == "css" {
                    node.visit_mut_children_with(self);
                }
            }
        }
    }

    fn visit_mut_key_value_prop(&mut self, node: &mut KeyValueProp) {
        if let Some(tpl) = node.value.as_tpl() {
            node.value = minify_css_style_tpl(tpl).into();
        }
    }
}

pub fn minify_transform() -> impl VisitMut {
    TransformVisitor::default()
}
