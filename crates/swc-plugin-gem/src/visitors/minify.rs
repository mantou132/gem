use once_cell::sync::Lazy;
use regex::Regex;
use swc_common::DUMMY_SP;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::{Callee, KeyValueProp, TaggedTpl, Tpl, TplElement};

static HEAD_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)\s*(\{)\s*").unwrap());
static TAIL_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)(;|})\s+").unwrap());
static SPACE_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)\s+").unwrap());
static COMMENT_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)/\\*.*\\*/").unwrap());

fn minify_css_style_tpl(tpl: &Tpl) -> Tpl {
    Tpl {
        span: DUMMY_SP,
        exprs: tpl.exprs.clone(),
        quasis: tpl
            .quasis
            .iter()
            .map(|x| {
                let removed_comment = &COMMENT_REG.replace_all(x.raw.as_str(), "");
                let removed_head = &HEAD_REG.replace_all(removed_comment, "$1");
                let removed_tail = &TAIL_REG.replace_all(removed_head, "$1");
                let removed_space = SPACE_REG.replace_all(removed_tail, " ");
                TplElement {
                    span: DUMMY_SP,
                    tail: x.tail,
                    cooked: None,
                    raw: removed_space.trim().into(),
                }
            })
            .collect(),
    }
}

static TAG_BEFORE_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)\s*<").unwrap());
static TAG_AFTER_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)>\s*").unwrap());
static TAG_COMMENT_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)<!--.*?-->").unwrap());

fn minify_html_tpl(tpl: &Tpl) -> Tpl {
    Tpl {
        span: DUMMY_SP,
        exprs: tpl.exprs.clone(),
        quasis: tpl
            .quasis
            .iter()
            .map(|x| {
                let removed_before = &TAG_BEFORE_REG.replace_all(x.raw.as_str(), "<");
                let removed_after = &TAG_AFTER_REG.replace_all(removed_before, ">");
                let removed_comment = TAG_COMMENT_REG.replace_all(removed_after, "");
                TplElement {
                    span: DUMMY_SP,
                    tail: x.tail,
                    cooked: None,
                    raw: removed_comment.into(),
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
                node.tpl = Box::new(minify_css_style_tpl(&node.tpl));
            }
            if tag_fn == "html" || tag_fn == "raw" {
                node.tpl = Box::new(minify_html_tpl(&node.tpl));
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
