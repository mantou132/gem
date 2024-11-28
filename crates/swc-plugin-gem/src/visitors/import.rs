use indexmap::{IndexMap, IndexSet};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use std::{collections::HashMap, fs};
use swc_common::{SyntaxContext, DUMMY_SP};
use swc_core::{
    atoms::Atom,
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
};
use swc_ecma_ast::{
    Callee, Class, ClassDecl, ClassExpr, Decorator, FnDecl, FnExpr, Id, Ident, ImportDecl,
    ImportNamedSpecifier, ImportSpecifier, JSXElementName, ModuleDecl, ModuleItem, Str, TaggedTpl,
    VarDeclarator,
};

static CUSTOM_ELEMENT_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?s)<(?<tag>\w+(-\w+)+)(\s|>)").unwrap());

#[derive(Deserialize, Debug, Clone, PartialEq)]
#[serde(untagged)]
enum MemberOrMemberAs {
    Member(String),
    MemberAs([String; 2]),
}

#[derive(Deserialize, Debug, Clone, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
struct AutoImportContent {
    members: HashMap<String, Vec<MemberOrMemberAs>>,
    elements: IndexMap<String, IndexMap<String, String>>,
}

struct AutoImportConfig {
    /// member -> package name
    member_map: HashMap<String, String>,
    /// tag reg, path reg
    tag_config: Vec<(Regex, String)>,
}

static GEM_AUTO_IMPORT_CONFIG: Lazy<AutoImportConfig> = Lazy::new(|| {
    let content: &str = include_str!("../auto-import.json");
    let content = serde_json::from_str::<AutoImportContent>(content).expect("invalid json");

    let mut member_map = HashMap::new();

    for (package, import_vec) in content.members.iter() {
        for member in import_vec {
            // TODO: support `MemberAs`
            if let MemberOrMemberAs::Member(name) = member {
                member_map.insert(name.into(), package.into());
            }
        }
    }

    let mut tag_config = Vec::new();

    for (package, import_map) in content.elements {
        for (tag, path) in import_map {
            if let Ok(reg) = Regex::new(&tag.replace("*", "(.*)")) {
                tag_config.push((reg, format!("{}{}", package, path.replace("*", "$1"))));
            }
        }
    }

    AutoImportConfig {
        member_map,
        tag_config,
    }
});

#[derive(Default)]
pub struct TransformVisitor {
    used_members: IndexSet<Id>,
    defined_members: IndexSet<Id>,
    used_elements: IndexSet<String>,
}

impl TransformVisitor {
    fn inset_used_member(&mut self, ident: &Ident) {
        self.used_members.insert(ident.to_id());
    }

    fn inset_defined_member(&mut self, ident: &Ident) {
        self.defined_members.insert(ident.to_id());
    }

    fn visit_mut_class(&mut self, node: &Box<Class>) {
        if let Some(expr) = &node.super_class {
            if let Some(ident) = expr.as_ident() {
                self.inset_used_member(ident);
            }
            // support decorators transform
            // class PageHomeElement extends (_GemElement = GemElement) {}
            if let Some(assign) = expr.as_assign() {
                if let Some(ident) = assign.right.as_ident() {
                    self.inset_used_member(ident);
                }
            }
        }
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_import_specifier(&mut self, node: &mut ImportSpecifier) {
        self.inset_defined_member(node.local());
    }

    fn visit_mut_callee(&mut self, node: &mut Callee) {
        if let Callee::Expr(expr) = &node {
            if let Some(ident) = expr.as_ident() {
                self.inset_used_member(ident);
            }
        }
    }

    fn visit_mut_jsx_element_name(&mut self, node: &mut JSXElementName) {
        if let JSXElementName::Ident(ident) = node {
            self.inset_used_member(ident);
        }
    }

    fn visit_mut_decorator(&mut self, node: &mut Decorator) {
        node.visit_mut_children_with(self);

        if let Some(ident) = node.expr.as_ident() {
            self.inset_used_member(ident);
        }
    }

    fn visit_mut_tagged_tpl(&mut self, node: &mut TaggedTpl) {
        node.visit_mut_children_with(self);

        if let Some(ident) = node.tag.as_ident() {
            self.inset_used_member(ident);
        }

        for ele in node.tpl.quasis.iter() {
            for cap in CUSTOM_ELEMENT_REGEX.captures_iter(ele.raw.as_str()) {
                self.used_elements.insert(cap["tag"].to_string());
            }
        }
    }

    fn visit_mut_class_decl(&mut self, node: &mut ClassDecl) {
        node.visit_mut_children_with(self);

        self.visit_mut_class(&node.class);
        self.inset_defined_member(&node.ident);
    }

    fn visit_mut_class_expr(&mut self, node: &mut ClassExpr) {
        node.visit_mut_children_with(self);

        self.visit_mut_class(&node.class);
        if let Some(ident) = &node.ident {
            self.inset_defined_member(ident);
        }
    }

    fn visit_mut_fn_decl(&mut self, node: &mut FnDecl) {
        node.visit_mut_children_with(self);

        self.inset_defined_member(&node.ident);
    }

    fn visit_mut_fn_expr(&mut self, node: &mut FnExpr) {
        node.visit_mut_children_with(self);

        if let Some(ident) = &node.ident {
            self.inset_defined_member(ident);
        }
    }

    fn visit_mut_var_declarator(&mut self, node: &mut VarDeclarator) {
        node.visit_mut_children_with(self);

        if let Some(ident) = &node.name.as_ident() {
            self.inset_defined_member(&ident);
        }
    }

    // https://swc.rs/docs/plugin/ecmascript/cheatsheet#inserting-new-nodes
    // 只处理模块
    fn visit_mut_module_items(&mut self, node: &mut Vec<ModuleItem>) {
        node.visit_mut_children_with(self);

        let mut out: Vec<ImportDecl> = vec![];
        let mut available_import: HashMap<String, IndexMap<&Atom, (&Atom, &SyntaxContext)>> =
            HashMap::new();

        for id in self.used_members.iter() {
            if !self.defined_members.contains(id) {
                let pkg = GEM_AUTO_IMPORT_CONFIG.member_map.get(id.0.as_str());
                if let Some(pkg) = pkg {
                    let set = available_import
                        .entry(pkg.into())
                        .or_insert(Default::default());
                    set.insert(&id.0, (&id.0, &id.1));
                }
            }
        }

        for (pkg, set) in available_import {
            let mut specifiers: Vec<ImportSpecifier> = vec![];
            for (member, (_member_as, ctx)) in set {
                specifiers.push(ImportSpecifier::Named(ImportNamedSpecifier {
                    local: Ident::new(member.clone(), DUMMY_SP, ctx.clone()),
                    span: DUMMY_SP,
                    imported: None,
                    is_type_only: false,
                }));
            }
            out.push(ImportDecl {
                specifiers,
                // 也许可以支持替换：'@mantou/gem/{:pascal:}' + ColorPicker -> '@mantou/gem/ColorPicker'
                src: Box::new(Str::from(pkg)),
                span: DUMMY_SP,
                type_only: false,
                with: None,
                phase: Default::default(),
            });
        }

        for tag in self.used_elements.iter() {
            for (reg, path) in GEM_AUTO_IMPORT_CONFIG.tag_config.iter() {
                if reg.is_match(tag) {
                    out.push(ImportDecl {
                        specifiers: vec![],
                        src: Box::new(Str::from(reg.replace(tag, path))),
                        span: DUMMY_SP,
                        type_only: false,
                        with: None,
                        phase: Default::default(),
                    });
                    break;
                }
            }
        }

        node.splice(
            0..0,
            out.into_iter()
                .map(ModuleDecl::Import)
                .map(ModuleItem::ModuleDecl),
        );
    }
}

pub fn import_transform() -> impl VisitMut {
    TransformVisitor::default()
}

static mut GEN_DTS: bool = false;

pub fn gen_once_dts() {
    unsafe {
        if GEN_DTS {
            return;
        }
        GEN_DTS = true;
    }
    let mut import_list: Vec<String> = vec![];
    for (member, pkg) in GEM_AUTO_IMPORT_CONFIG.member_map.iter() {
        import_list.push(format!(
            "const {member}: typeof import('{pkg}')['{member}'];",
        ));
    }
    fs::write(
        // https://github.com/swc-project/swc/discussions/4997
        "/cwd/src/auto-import.d.ts",
        format!(
            r#"
              // AUTOMATICALLY GENERATED, DO NOT MODIFY MANUALLY.
              export {{}}
              declare global {{
                {}
              }}
            "#,
            import_list.join("\n")
        ),
    )
    .expect("create dts error");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_return_default_config() {
        let content: &str = include_str!("../auto-import.json");
        let config = serde_json::from_str::<AutoImportContent>(content).unwrap();
        assert_eq!(
            format!("{:?}", config.elements.get("duoyun-ui").unwrap().keys()),
            r#"["dy-pat-*", "dy-input-*", "dy-*"]"#
        )
    }
}
