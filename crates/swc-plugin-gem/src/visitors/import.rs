use std::{collections::HashMap, env, fs, path::Path};

use indexmap::{IndexMap, IndexSet};
use node_resolve::Resolver;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use swc_common::{Spanned, SyntaxContext, DUMMY_SP};
use swc_core::{
    atoms::Atom,
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
};
use swc_ecma_ast::{
    Callee, Class, ClassDecl, ClassExpr, ExprOrSpread, FnDecl, FnExpr, Id, Ident, ImportDecl,
    ImportNamedSpecifier, ImportSpecifier, Lit, ModuleDecl, ModuleExportName, ModuleItem, Str,
    TaggedTpl, VarDeclarator,
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

fn is_match(target: &str, pattern: &str) -> bool {
    let normalized_target = target.replace('\\', "/");
    let normalized_pattern = pattern.replace('\\', "/");

    if normalized_target == normalized_pattern {
        return true;
    }

    if normalized_target.ends_with(&format!("/{normalized_pattern}")) {
        return true;
    }

    if normalized_pattern.contains('*') || normalized_pattern.contains('?') {
        let glob_regex = format!(
            "^{}$",
            regex::escape(&normalized_pattern)
                .replace(r"\*", ".*")
                .replace(r"\?", ".")
        );
        if let Ok(re) = Regex::new(&glob_regex) {
            if re.is_match(&normalized_target) {
                return true;
            }
            if let Some(file_name) = normalized_target.rsplit('/').next() {
                if re.is_match(file_name) {
                    return true;
                }
            }
        }
    }

    if normalized_pattern
        .chars()
        .any(|c| "^$()[]{}+|\\".contains(c))
    {
        if let Ok(re) = Regex::new(&normalized_pattern) {
            if re.is_match(&normalized_target) {
                return true;
            }
        }
    }

    false
}

fn is_file_excluded(filename: Option<&str>, patterns: &[String]) -> bool {
    if let Some(file) = filename {
        for pattern in patterns {
            if is_match(file, pattern) {
                return true;
            }
        }
    }
    false
}

#[derive(Deserialize, Serialize, Default)]
struct AutoImportConfig {
    /// local -> (imported, package name)
    member_map: HashMap<String, (Option<Atom>, String)>,
    tag_config: Vec<RegexStringPair>,
    exclude_member_files: Vec<String>,
    exclude_element_files: Vec<String>,
}

#[derive(Default)]
struct TransformVisitor {
    config: AutoImportConfig,
    filename: Option<String>,
    used_members: IndexSet<Id>,
    defined_members: IndexSet<Id>,
    used_elements: IndexSet<String>,
    defined_elements: IndexSet<String>,
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

    fn normalize_auto_import_ctxt(&self, ident: &mut Ident) {
        if self.config.member_map.contains_key(ident.sym.as_str())
            && !self.defined_members.contains(&ident.to_id())
        {
            ident.ctxt = SyntaxContext::empty();
        }
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
        self.normalize_auto_import_ctxt(node);
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

    fn visit_mut_class(&mut self, node: &mut Class) {
        node.visit_mut_children_with(self);

        for decorator in &node.decorators {
            if let Some(call_expr) = decorator.expr.as_call() {
                if let Callee::Expr(callee_expr) = &call_expr.callee {
                    if let Some(Ident { sym, .. }) = callee_expr.as_ident() {
                        if sym.as_str() == "customElement" {
                            if let Some(ExprOrSpread { expr, .. }) = call_expr.args.first() {
                                if let Some(Lit::Str(tag_name)) = expr.as_lit() {
                                    if let Some(tag) = tag_name.value.as_str() {
                                        self.defined_elements.insert(tag.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
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

        let first_item_span = node.first().map(|item| item.span()).unwrap_or(DUMMY_SP);
        let mut out: Vec<ImportDecl> = vec![];
        let mut available_import: IndexMap<String, IndexMap<&Atom, Option<&Atom>>> =
            IndexMap::new();

        let is_file_members_excluded =
            is_file_excluded(self.filename.as_deref(), &self.config.exclude_member_files);
        let is_file_elements_excluded =
            is_file_excluded(self.filename.as_deref(), &self.config.exclude_element_files);

        if !is_file_members_excluded {
            for id in &self.used_members {
                if !self.defined_members.contains(id) {
                    let res = self.config.member_map.get(id.0.as_str());
                    if let Some((imported, pkg)) = res {
                        let set = available_import.entry(pkg.into()).or_default();
                        set.insert(&id.0, imported.as_ref());
                    }
                }
            }

            for (pkg, set) in available_import {
                let mut specifiers: Vec<ImportSpecifier> = vec![];
                for (member_as, member) in set {
                    specifiers.push(ImportSpecifier::Named(ImportNamedSpecifier {
                        // Use empty syntax context so imports survive decorator downlevel
                        // transforms that rebind identifiers with a different ctxt (2023-11).
                        local: Ident::new(member_as.clone(), DUMMY_SP, SyntaxContext::empty()),
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
        }

        if !is_file_elements_excluded {
            for tag in &self.used_elements {
                if self.defined_elements.contains(tag) {
                    continue;
                }
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
        }

        if let Some(first) = out.first_mut() {
            first.span = first_item_span;
        }

        node.splice(
            0..0,
            out.into_iter()
                .map(ModuleDecl::Import)
                .map(ModuleItem::ModuleDecl),
        );
    }
}

pub fn import_transform(
    auto_import: AutoImport,
    gen_dts: AutoImportDts,
    filename: Option<String>,
) -> impl VisitMut {
    let visitor = TransformVisitor {
        config: get_config(auto_import),
        filename,
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
    pub exclude_member_files: Option<Vec<String>>,
    pub exclude_element_files: Option<Vec<String>>,
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
            let mut exclude_member_files = Vec::new();
            let mut exclude_element_files = Vec::new();
            for lv in chain {
                elements.extend(lv.elements.unwrap_or_default());
                members.extend(lv.members.unwrap_or_default());
                if let Some(em) = lv.exclude_member_files {
                    exclude_member_files.extend(em);
                }
                if let Some(ee) = lv.exclude_element_files {
                    exclude_element_files.extend(ee);
                }
            }

            AutoImportContent {
                extends: None,
                elements: Some(elements),
                members: Some(members),
                exclude_member_files: Some(exclude_member_files),
                exclude_element_files: Some(exclude_element_files),
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
            let mut pattern = tag.replace('*', "(.*)");
            if !pattern.starts_with('^') {
                pattern = format!("^{pattern}");
            }
            if !pattern.ends_with('$') {
                pattern.push('$');
            }
            if let Ok(regex) = Regex::new(&pattern) {
                tag_config.push(RegexStringPair {
                    regex,
                    path: format!("{}{}", package, path.replace('*', "$1")),
                });
            }
        }
    }

    let exclude_member_files = content.exclude_member_files.unwrap_or_default();
    let exclude_element_files = content.exclude_element_files.unwrap_or_default();

    AutoImportConfig {
        member_map,
        tag_config,
        exclude_member_files,
        exclude_element_files,
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
            r#"["dy-pat-*", "dy-light-route", "dy-active-link", "dy-tab-panel", "dy-sort-(item|handle)", "dy-(input|form|avatar|radio|checkbox|collapse|more|popover|tree|selection-box)-*", "dy-*"]"#
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
            r#"["dy-pat-*", "dy-light-route", "dy-active-link", "dy-tab-panel", "dy-sort-(item|handle)", "dy-(input|form|avatar|radio|checkbox|collapse|more|popover|tree|selection-box)-*", "dy-*"]"#
        )
    }

    #[test]
    fn should_match_elements_sharing_a_module() {
        let config = get_config(AutoImport::Gem(true));
        for (tag, path) in [
            ("dy-selection-box-mask", "duoyun-ui/elements/selection-box"),
            ("dy-sort-item", "duoyun-ui/elements/sort-box"),
            ("dy-sort-handle", "duoyun-ui/elements/sort-box"),
            ("dy-more-slot", "duoyun-ui/elements/more"),
            ("dy-popover-ghost", "duoyun-ui/elements/popover"),
            ("dy-tree-item", "duoyun-ui/elements/tree"),
            ("dy-tab-panel", "duoyun-ui/elements/tabs"),
        ] {
            let pair = config
                .tag_config
                .iter()
                .find(|pair| pair.regex.is_match(tag))
                .unwrap();
            assert_eq!(pair.regex.replace(tag, &pair.path), path);
        }
    }

    #[test]
    fn should_match_exact_element_tag() {
        let config = get_config(AutoImport::CustomContent(AutoImportContent {
            elements: Some(
                vec![(
                    "deck".to_string(),
                    vec![("deck-*".to_string(), "/elements/*".to_string())]
                        .into_iter()
                        .collect(),
                )]
                .into_iter()
                .collect(),
            ),
            ..Default::default()
        }));

        let tag_pair = &config.tag_config[0];
        assert!(!tag_pair.regex.is_match("agentdeck-xxx"));
        assert!(tag_pair.regex.is_match("deck-xxx"));
        assert_eq!(
            tag_pair.regex.replace("deck-xxx", &tag_pair.path),
            "deck/elements/xxx"
        );
    }

    #[test]
    fn should_support_exclude_members_and_elements() {
        let content: AutoImportContent = serde_json::from_str(
            r#"{
            "extends": "gem",
            "excludeMemberFiles": ["store.ts"],
            "excludeElementFiles": ["store.ts"]
        }"#,
        )
        .unwrap();

        assert_eq!(
            content.exclude_member_files,
            Some(vec!["store.ts".to_string()])
        );
        assert_eq!(
            content.exclude_element_files,
            Some(vec!["store.ts".to_string()])
        );

        let config = get_config(AutoImport::CustomContent(content));
        assert!(is_file_excluded(
            Some("/path/to/store.ts"),
            &config.exclude_element_files
        ));
        assert!(!is_file_excluded(
            Some("/path/to/main.ts"),
            &config.exclude_element_files
        ));
    }
}
