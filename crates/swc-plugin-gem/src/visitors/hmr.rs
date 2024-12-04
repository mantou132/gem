//! https://rspack.dev/api/runtime-api/hmr
//! 为 HMR 添加一些特殊的转换

use swc_core::{
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
    quote,
};
use swc_ecma_ast::ModuleItem;

#[derive(Default)]
struct TransformVisitor {}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_module_items(&mut self, node: &mut Vec<ModuleItem>) {
        node.visit_mut_children_with(self);

        node.push(quote!(
            "
            if (module.hot) {
               module.hot.accept();
            }
            " as ModuleItem,
        ));
    }
}

pub fn hmr_transform() -> impl VisitMut {
    TransformVisitor::default()
}
