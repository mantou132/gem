use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use std::collections::{BTreeMap, HashMap, HashSet};
use swc_common::DUMMY_SP;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::{
    Callee, Class, ClassDecl, ClassExpr, Decorator, Ident, ImportDecl, ImportNamedSpecifier,
    ImportSpecifier, ModuleDecl, ModuleItem, Str, TaggedTpl,
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
    elements: HashMap<String, HashMap<String, String>>,
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

trait IdentString {
    fn to_name(&self) -> String;
}

impl IdentString for Ident {
    fn to_name(&self) -> String {
        self.sym.as_str().into()
    }
}

#[derive(Default)]
pub struct TransformVisitor {
    used_members: Vec<String>,
    defined_members: HashSet<String>,
    used_elements: Vec<String>,
}

impl TransformVisitor {
    fn visit_mut_class(&mut self, node: &Box<Class>) {
        if let Some(expr) = &node.super_class {
            if let Some(ident) = expr.as_ident() {
                self.used_members.push(ident.to_name());
            }
        }
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_import_specifier(&mut self, node: &mut ImportSpecifier) {
        self.defined_members.insert(node.local().to_name());
    }

    fn visit_mut_callee(&mut self, node: &mut Callee) {
        if let Callee::Expr(expr) = &node {
            if let Some(ident) = expr.as_ident() {
                self.used_members.push(ident.to_name());
            }
        }
    }

    fn visit_mut_decorator(&mut self, node: &mut Decorator) {
        node.visit_mut_children_with(self);

        if let Some(ident) = node.expr.as_ident() {
            self.used_members.push(ident.to_name());
        }
    }

    fn visit_mut_tagged_tpl(&mut self, node: &mut TaggedTpl) {
        node.visit_mut_children_with(self);

        if let Some(ident) = node.tag.as_ident() {
            self.used_members.push(ident.to_name());
        }

        for ele in node.tpl.quasis.iter() {
            for cap in CUSTOM_ELEMENT_REGEX.captures_iter(ele.raw.as_str()) {
                self.used_elements.push(cap["tag"].to_string());
            }
        }
    }

    fn visit_mut_class_decl(&mut self, node: &mut ClassDecl) {
        node.visit_mut_children_with(self);

        self.visit_mut_class(&node.class);
    }

    fn visit_mut_class_expr(&mut self, node: &mut ClassExpr) {
        node.visit_mut_children_with(self);

        self.visit_mut_class(&node.class);
    }

    // https://swc.rs/docs/plugin/ecmascript/cheatsheet#inserting-new-nodes
    // 只处理模块
    fn visit_mut_module_items(&mut self, node: &mut Vec<ModuleItem>) {
        // TODO: 收集顶层声明, 防止重复声明
        node.visit_mut_children_with(self);

        let mut out: Vec<ImportDecl> = vec![];
        let mut available_import: HashMap<String, BTreeMap<String, String>> = HashMap::new();

        for used_member in self.used_members.iter() {
            if !self.defined_members.contains(used_member) {
                let pkg = GEM_AUTO_IMPORT_CONFIG.member_map.get(used_member);
                if let Some(pkg) = pkg {
                    let set = available_import
                        .entry(pkg.into())
                        .or_insert(Default::default());
                    set.insert(used_member.into(), used_member.into());
                }
            }
        }

        for (pkg, set) in available_import {
            let mut specifiers: Vec<ImportSpecifier> = vec![];
            for (member, _) in set {
                specifiers.push(ImportSpecifier::Named(ImportNamedSpecifier {
                    local: member.into(),
                    span: DUMMY_SP,
                    imported: None,
                    is_type_only: false,
                }));
            }
            out.push(ImportDecl {
                specifiers,
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
