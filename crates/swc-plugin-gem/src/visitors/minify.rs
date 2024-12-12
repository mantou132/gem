use once_cell::sync::Lazy;
use regex::Regex;
use swc_common::DUMMY_SP;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::{Callee, KeyValueProp, TaggedTpl, Tpl, TplElement};

static HEAD_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)\s*(\{)\s*").unwrap());
static TAIL_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)(;|})\s+").unwrap());
static SPACE_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)\s+").unwrap());
static COMMENT_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)/\\*.*\\*/").unwrap());

fn minify_tpl(tpl: &Tpl) -> Tpl {
    Tpl {
        span: DUMMY_SP,
        exprs: tpl.exprs.clone(),
        quasis: tpl
            .quasis
            .iter()
            .map(|x| {
                let remove_comment = &COMMENT_REG.replace_all(x.raw.as_str(), "");
                let remove_head = &HEAD_REG.replace_all(remove_comment, "$1");
                let remove_tail = &TAIL_REG.replace_all(remove_head, "$1");
                let remove_space = SPACE_REG.replace_all(remove_tail, " ");
                TplElement {
                    span: DUMMY_SP,
                    tail: x.tail,
                    cooked: None,
                    raw: remove_space.trim().into(),
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
                node.tpl = Box::new(minify_tpl(&node.tpl));
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
            node.value = minify_tpl(tpl).into();
        }
    }
}

pub fn minify_transform() -> impl VisitMut {
    TransformVisitor::default()
}
