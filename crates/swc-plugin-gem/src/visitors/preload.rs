use once_cell::sync::Lazy;
use regex::Regex;
use swc_core::{
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
    quote,
};
use swc_ecma_ast::{Ident, ImportDecl, ModuleItem, Str};

static IMG_REG: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\.(svg|gif|jpe?g|tiff?|a?png|webp|avif|bmp)$").unwrap());

enum AwaitItem {
    Img(Ident),
    ArrayBuffer(Ident),
}

#[derive(Default)]
struct TransformVisitor {
    await_items: Vec<AwaitItem>,
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_import_decl(&mut self, node: &mut ImportDecl) {
        if let Some((source, prefix)) = node.src.value.split_once("?") {
            if prefix != "preload" {
                return;
            }
            let ident = node
                .specifiers
                .get_mut(0)
                .expect("preload only allow one specifier")
                .local_mut();
            if IMG_REG.is_match(source) {
                self.await_items.push(AwaitItem::Img(ident.clone()));
            } else {
                ident.sym = format!("_{}", ident.sym.as_str()).into();
                self.await_items.push(AwaitItem::ArrayBuffer(ident.clone()));
            }
            node.src = Box::new(Str::from([source, "url"].join("?")));
        }
    }

    fn visit_mut_module_items(&mut self, node: &mut Vec<ModuleItem>) {
        node.visit_mut_children_with(self);

        let mut out: Vec<ModuleItem> = vec![];

        while let Some(item) = self.await_items.pop() {
            match item {
                AwaitItem::Img(source) => {
                    out.push(quote!(
                      "
                      await new Promise((onload, onerror) => Object.assign(new Image, {src: $source, onload, onerror}))
                      " as ModuleItem,
                      source: Ident = source
                    ));
                }
                AwaitItem::ArrayBuffer(source) => {
                    out.push(quote!(
                        "
                        const data = await fetch($source).then(e => e.arrayBuffer())
                        " as ModuleItem,
                        source: Ident = source
                    ));
                }
            }
        }

        let index = node.partition_point(|x| x.is_module_decl());

        node.splice(index..index, out);
    }
}

pub fn preload_transform() -> impl VisitMut {
    TransformVisitor::default()
}
