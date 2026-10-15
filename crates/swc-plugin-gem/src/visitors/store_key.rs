//! 模块顶层 `const x = createStore(...)` 添加 key 参数，改为 `createStore(..., "{文件哈希}_x")`，
//! SSR 时服务端和客户端用 key 同步 store 的值
//!
//! - 只识别直接调用 `createStore` 标识符，和 HMR 保留 store 的规则一样
//! - 已经有第二个参数时不处理

use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut};
use swc_ecma_ast::{Decl, ExportDecl, Expr, Lit, ModuleDecl, ModuleItem, Pat, Stmt, VarDecl};

use super::hash_string;

struct TransformVisitor {
    filename: String,
}

impl TransformVisitor {
    fn add_key(&self, var: &mut VarDecl) {
        for decl in var.decls.iter_mut() {
            let (Pat::Ident(name), Some(init)) = (&decl.name, &mut decl.init) else {
                continue;
            };
            let Some(call) = init.as_mut_call() else {
                continue;
            };
            let is_create_store = call
                .callee
                .as_expr()
                .and_then(|callee| callee.as_ident())
                .is_some_and(|ident| &*ident.sym == "createStore");
            if !is_create_store || call.args.len() != 1 {
                continue;
            }
            let key = format!("{:x}_{}", hash_string(&self.filename), name.id.sym);
            call.args.push(Expr::Lit(Lit::Str(key.into())).into());
        }
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_module_items(&mut self, node: &mut Vec<ModuleItem>) {
        for item in node.iter_mut() {
            let var = match item {
                ModuleItem::Stmt(Stmt::Decl(Decl::Var(var))) => var,
                ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                    decl: Decl::Var(var),
                    ..
                })) => var,
                _ => continue,
            };
            self.add_key(var);
        }
    }
}

pub fn store_key_transform(filename: Option<String>) -> impl VisitMut {
    TransformVisitor {
        filename: filename.unwrap_or_default(),
    }
}
