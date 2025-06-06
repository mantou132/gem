use once_cell::sync::Lazy;
use regex::Regex;
use swc_common::DUMMY_SP;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::{TaggedTpl, Tpl, TplElement};

static COMMENT_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"&([^ {]+)").unwrap());

fn trans_css_tpl(tpl: &Tpl) -> Tpl {
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
                raw: COMMENT_REG
                    .replace_all(x.raw.as_str(), ":is(&$1,:host($1))")
                    .into(),
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
            if tag_fn == "css" {
                node.tpl = Box::new(trans_css_tpl(&node.tpl));
            }
        }
    }
}

pub fn selector_transform() -> impl VisitMut {
    TransformVisitor::default()
}
