///! 验证模块是否为文件，是就添加 .js 否就添加 /index.js
///!   识别模块是否为相对路径，如何是 ts 需要处理
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut};
use swc_ecma_ast::{CallExpr, Callee, ExprOrSpread, ImportDecl, Lit, Str};

fn resolve_path(origin: &str) -> Str {
    return format!("{}.js", origin).into();
}

#[derive(Default)]
struct TransformVisitor {}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_import_decl(&mut self, node: &mut ImportDecl) {
        node.src = resolve_path(node.src.value.as_str()).into();
    }

    // 只处理 string 的动态导入
    fn visit_mut_call_expr(&mut self, node: &mut CallExpr) {
        if let Callee::Import(_) = node.callee {
            if let Some(Some(Lit::Str(source))) = node.args.get(0).map(|e| e.expr.as_lit()) {
                node.args = vec![ExprOrSpread {
                    spread: None,
                    expr: resolve_path(source.value.as_str()).into(),
                }]
            }
        }
    }
}

pub fn path_transform() -> impl VisitMut {
    TransformVisitor::default()
}
