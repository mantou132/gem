use std::{env, path::Path};

use node_resolve::Resolver;
use pathdiff::diff_paths;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut};
use swc_ecma_ast::{CallExpr, Callee, ExprOrSpread, ImportDecl, Lit, Str};
use typed_path::{Utf8Path, Utf8UnixEncoding, Utf8WindowsEncoding};

fn converting_to_unix_path(path: &Path) -> String {
    let windows_path = Utf8Path::<Utf8WindowsEncoding>::new(path.to_str().unwrap());
    windows_path.with_encoding::<Utf8UnixEncoding>().to_string()
}

#[derive(Default)]
struct TransformVisitor {
    filename: Option<String>,
}

impl TransformVisitor {
    fn resolve_path(&self, origin: &str) -> Str {
        if let Some(filename) = &self.filename {
            let cwd = env::current_dir().expect("get current dir error");
            let full_filename = cwd.join(filename);
            let dir = full_filename.parent().unwrap();
            let resolver = Resolver::new()
                .with_extensions(["ts", "js", ".mjs"])
                .with_basedir(dir.to_path_buf());
            if let Ok(ref full_path) = resolver.resolve(origin) {
                if let Some(relative_path) = diff_paths(
                    converting_to_unix_path(full_path),
                    converting_to_unix_path(dir),
                ) {
                    if let Some(relative_path) = relative_path.to_str() {
                        let relative_path = relative_path.replace(".ts", ".js");
                        if !relative_path.starts_with(".") {
                            return format!("./{}", relative_path).into();
                        } else {
                            return relative_path.into();
                        }
                    }
                }
            }
        }
        origin.into()
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_import_decl(&mut self, node: &mut ImportDecl) {
        node.src = self.resolve_path(node.src.value.as_str()).into();
    }

    // 只处理 string 的动态导入
    fn visit_mut_call_expr(&mut self, node: &mut CallExpr) {
        if let Callee::Import(_) = node.callee {
            if let Some(Some(Lit::Str(source))) = node.args.first().map(|e| e.expr.as_lit()) {
                node.args = vec![ExprOrSpread {
                    spread: None,
                    expr: self.resolve_path(source.value.as_str()).into(),
                }]
            }
        }
    }
}

pub fn path_transform(filename: Option<String>) -> impl VisitMut {
    TransformVisitor { filename }
}
