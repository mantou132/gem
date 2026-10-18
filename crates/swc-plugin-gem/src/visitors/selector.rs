use once_cell::sync::Lazy;
use regex::{Captures, Regex};
use swc_common::DUMMY_SP;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::{TaggedTpl, Tpl, TplElement};

static COMMENT_REG: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r#"&((?:[^\s,{\(\["']+|\([^()]*\)|\[[^\]]*\]|"[^"]*"|'[^']*')+)"#,
    )
    .unwrap()
});

/// 伪元素不能放在 `:is()` 中，只包裹伪元素前面的部分
fn split_pseudo_element(selector: &str) -> (&str, &str) {
    let bytes = selector.as_bytes();
    let mut depth = 0;
    let mut quote = None;
    for (i, &c) in bytes.iter().enumerate() {
        match (quote, c) {
            (Some(q), _) if c == q => quote = None,
            (Some(_), _) => {}
            (None, b'"' | b'\'') => quote = Some(c),
            (None, b'(' | b'[') => depth += 1,
            (None, b')' | b']') => depth -= 1,
            (None, b':') if depth == 0 && bytes.get(i + 1) == Some(&b':') => {
                return selector.split_at(i);
            }
            _ => {}
        }
    }
    (selector, "")
}

fn replace_selector(caps: &Captures) -> String {
    let (compound, pseudo_element) = split_pseudo_element(&caps[1]);
    if compound.is_empty() {
        return caps[0].to_string();
    }
    format!(":is(&{compound},:host({compound})){pseudo_element}")
}

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
                    .replace_all(x.raw.as_str(), replace_selector)
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
                *node.tpl = trans_css_tpl(&node.tpl);
            }
        }
    }
}

pub fn selector_transform() -> impl VisitMut {
    TransformVisitor::default()
}
