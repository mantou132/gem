use std::{collections::HashMap, env, fs, path::Path};

use indexmap::{IndexMap, IndexSet};
use node_resolve::Resolver;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use swc_common::{SyntaxContext, DUMMY_SP};
use swc_core::{
    atoms::Atom,
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
};
use swc_ecma_ast::{
    ClassDecl, ClassExpr, FnDecl, FnExpr, Id, Ident, ImportDecl, ImportNamedSpecifier,
    ImportSpecifier, ModuleDecl, ModuleExportName, ModuleItem, Str, TaggedTpl, VarDeclarator,
};

static CUSTOM_ELEMENT_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?s)<(?<tag>\w+(-\w+)+)(\s|>)").unwrap());

#[derive(Deserialize, Debug, Clone, PartialEq)]
#[serde(untagged)]
pub enum MemberOrMemberAs {
    Member(String),
    MemberAs([String; 2]),
}

#[derive(Debug, Serialize, Deserialize)]
struct RegexStringPair {
    #[serde(with = "serde_regex")]
    regex: Regex,
    path: String,
}

#[derive(Deserialize, Serialize, Default)]
struct AutoImportConfig {
    /// local -> (imported, package name)
    member_map: HashMap<String, (Option<Atom>, String)>,
    tag_config: Vec<RegexStringPair>,
}

#[derive(Default)]
struct TransformVisitor {
    config: AutoImportConfig,
    used_members: IndexSet<Id>,
    defined_members: IndexSet<Id>,
    used_elements: IndexSet<String>,
}

impl TransformVisitor {
    fn gen_dts(&self, gen_dts: AutoImportDts) {
        let path = match gen_dts {
            AutoImportDts::Src(true) => "src/auto-import.d.ts".into(),
            AutoImportDts::Src(false) => "".into(),
            AutoImportDts::CustomPath(custom) => custom,
        };
        if path.is_empty() {
            return;
        }

        // https://github.com/swc-project/swc/discussions/4997
        let path = Path::new("/cwd").join(path);

        if path.exists() {
            return;
        }

        let mut import_list: Vec<String> = vec![
            "// AUTOMATICALLY GENERATED, DO NOT MODIFY MANUALLY.".into(),
            "// DELETING WILL REGENERATE".into(),
            "".into(),
            "export {}".into(),
            "declare global {".into(),
        ];
        for (local, (imported, pkg)) in &self.config.member_map {
            let member = imported
                .as_ref()
                .map_or(local.clone(), |x| x.as_str().to_string());
            import_list.push(format!(
                "  const {local}: typeof import('{pkg}')['{member}'];",
            ));
        }
        import_list.push("}".into());

        fs::write(path, import_list.join("\n")).expect("create dts error");
    }

    fn inset_used_member(&mut self, ident: &Ident) {
        self.used_members.insert(ident.to_id());
    }

    fn inset_defined_member(&mut self, ident: &Ident) {
        self.defined_members.insert(ident.to_id());
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_import_specifier(&mut self, node: &mut ImportSpecifier) {
        self.inset_defined_member(node.local());
    }

    fn visit_mut_ident(&mut self, node: &mut Ident) {
        self.inset_used_member(node);
    }

    fn visit_mut_tagged_tpl(&mut self, node: &mut TaggedTpl) {
        node.visit_mut_children_with(self);

        for ele in &node.tpl.quasis {
            for cap in CUSTOM_ELEMENT_REGEX.captures_iter(ele.raw.as_str()) {
                self.used_elements.insert(cap["tag"].to_string());
            }
        }
    }

    fn visit_mut_class_decl(&mut self, node: &mut ClassDecl) {
        node.visit_mut_children_with(self);

        self.inset_defined_member(&node.ident);
    }

    fn visit_mut_class_expr(&mut self, node: &mut ClassExpr) {
        node.visit_mut_children_with(self);

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
            self.inset_defined_member(ident);
        }
    }

    // https://swc.rs/docs/plugin/ecmascript/cheatsheet#inserting-new-nodes
    // 只处理模块
    fn visit_mut_module_items(&mut self, node: &mut Vec<ModuleItem>) {
        node.visit_mut_children_with(self);

        let mut out: Vec<ImportDecl> = vec![];
        let mut available_import: IndexMap<
            String,
            IndexMap<&Atom, (Option<&Atom>, &SyntaxContext)>,
        > = IndexMap::new();

        for id in &self.used_members {
            if !self.defined_members.contains(id) {
                let res = self.config.member_map.get(id.0.as_str());
                if let Some((imported, pkg)) = res {
                    let set = available_import.entry(pkg.into()).or_default();
                    set.insert(&id.0, (imported.as_ref(), &id.1));
                }
            }
        }

        for (pkg, set) in available_import {
            let mut specifiers: Vec<ImportSpecifier> = vec![];
            for (member_as, (member, ctx)) in set {
                specifiers.push(ImportSpecifier::Named(ImportNamedSpecifier {
                    local: Ident::new(member_as.clone(), DUMMY_SP, *ctx),
                    span: DUMMY_SP,
                    imported: member.map(|x| ModuleExportName::Ident(x.clone().into())),
                    is_type_only: false,
                }));
            }
            out.push(ImportDecl {
                specifiers,
                // 也许可以支持替换：'@mantou/gem/{:pascal:}' + ColorPicker ->
                // '@mantou/gem/ColorPicker'
                src: Box::new(Str::from(pkg)),
                span: DUMMY_SP,
                type_only: false,
                with: None,
                phase: Default::default(),
            });
        }

        for tag in &self.used_elements {
            for RegexStringPair { regex, path } in &self.config.tag_config {
                if regex.is_match(tag) {
                    out.push(ImportDecl {
                        specifiers: vec![],
                        src: Box::new(Str::from(regex.replace(tag, path))),
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

pub fn import_transform(auto_import: AutoImport, gen_dts: AutoImportDts) -> impl VisitMut {
    let visitor = TransformVisitor {
        config: get_config(auto_import),
        ..Default::default()
    };

    visitor.gen_dts(gen_dts);

    visitor
}

#[derive(Deserialize, Debug, Clone, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct AutoImportContent {
    pub extends: Option<String>,
    pub members: Option<HashMap<String, Vec<MemberOrMemberAs>>>,
    pub elements: Option<IndexMap<String, IndexMap<String, String>>>,
}

#[derive(Deserialize, Debug, Clone, PartialEq)]
#[serde(untagged)]
pub enum AutoImport {
    Gem(bool),
    CustomContent(AutoImportContent),
}

impl Default for AutoImport {
    fn default() -> Self {
        AutoImport::Gem(false)
    }
}

#[derive(Deserialize, Debug, Clone, PartialEq)]
#[serde(untagged)]
pub enum AutoImportDts {
    Src(bool),
    CustomPath(String),
}

impl Default for AutoImportDts {
    fn default() -> Self {
        AutoImportDts::Src(false)
    }
}

fn merge_content(
    content: AutoImportContent,
    mut root: Vec<AutoImportContent>,
) -> Vec<AutoImportContent> {
    let extends = content.extends.clone();
    root.push(content);

    if let Some(extends) = extends {
        if extends == "gem" {
            return merge_content(get_config_content(AutoImport::Gem(true)), root);
        } else {
            let resolver = Resolver::new()
                .with_extensions(["json"])
                .with_basedir(env::current_dir().expect("get current dir error"));
            if let Ok(full_path) = resolver.resolve(&extends) {
                if let Ok(json_str) = fs::read_to_string(full_path) {
                    if let Ok(json) = serde_json::from_str::<AutoImportContent>(&json_str) {
                        return merge_content(json, root);
                    }
                }
            }
        }
    }

    root
}

fn get_config_content(config: AutoImport) -> AutoImportContent {
    match config {
        AutoImport::Gem(_) => {
            let content: &str = include_str!("../auto-import.json");
            serde_json::from_str::<AutoImportContent>(content).expect("invalid json")
        }
        AutoImport::CustomContent(content) => {
            let chain = merge_content(content, vec![]);

            let mut elements = IndexMap::default();
            let mut members = HashMap::default();
            for lv in chain {
                elements.extend(lv.elements.unwrap_or_default());
                members.extend(lv.members.unwrap_or_default());
            }

            AutoImportContent {
                extends: None,
                elements: Some(elements),
                members: Some(members),
            }
        }
    }
}

fn get_config(auto_import: AutoImport) -> AutoImportConfig {
    // TODO: use cache
    let content = get_config_content(auto_import);
    let mut member_map = HashMap::new();

    for (package, import_vec) in &content.members.unwrap_or_default() {
        for member in import_vec {
            match member {
                MemberOrMemberAs::Member(name) => {
                    member_map.insert(name.into(), (None, package.into()));
                }
                MemberOrMemberAs::MemberAs([name, member_as]) => {
                    member_map.insert(
                        member_as.into(),
                        (Some(name.clone().into()), package.into()),
                    );
                }
            }
        }
    }

    let mut tag_config = Vec::new();

    for (package, import_map) in content.elements.unwrap_or_default() {
        for (tag, path) in import_map {
            if let Ok(regex) = Regex::new(&tag.replace("*", "(.*)")) {
                tag_config.push(RegexStringPair {
                    regex,
                    path: format!("{}{}", package, path.replace("*", "$1")),
                });
            }
        }
    }

    AutoImportConfig {
        member_map,
        tag_config,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_return_default_config() {
        assert_eq!(
            format!(
                "{:?}",
                get_config_content(AutoImport::Gem(true))
                    .elements
                    .unwrap_or_default()
                    .get("duoyun-ui")
                    .unwrap()
                    .keys()
            ),
            r#"["dy-pat-*", "dy-input-*", "dy-*"]"#
        )
    }

    #[test]
    fn should_support_extend_config() {
        assert_eq!(
            format!(
                "{:?}",
                get_config_content(AutoImport::CustomContent(
                    serde_json::from_str::<AutoImportContent>(r#"{"extends":"gem"}"#).unwrap()
                ))
                .elements
                .unwrap_or_default()
                .get("duoyun-ui")
                .unwrap()
                .keys()
            ),
            r#"["dy-pat-*", "dy-input-*", "dy-*"]"#
        )
    }
}
