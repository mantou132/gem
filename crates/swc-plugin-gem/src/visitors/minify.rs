use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::TaggedTpl;

#[derive(Default)]
struct TransformVisitor {}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_tagged_tpl(&mut self, node: &mut TaggedTpl) {
        node.visit_mut_children_with(self);

        for _ele in node.tpl.quasis.iter() {
            // TODO: implement
        }
    }
}

pub fn minify_transform() -> impl VisitMut {
    TransformVisitor::default()
}
