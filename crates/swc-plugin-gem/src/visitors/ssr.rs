//! SSR 支持
//!
//! 客户端和服务端构建：模块顶层 `const x = createStore(...)` 添加 key 参数，
//! 改为 `createStore(..., "{文件哈希}_x")`，服务端和客户端用 key 同步 store 的值
//! （只识别直接调用 `createStore` 标识符，和 HMR 保留 store 的规则一样，已经有第二个参数时不处理）；
//! `createTheme` `createScopedTheme` `createDecoratorTheme` 同样添加 key，用作 css 变量名的后缀
//!
//! 客户端构建：改写 `@server()` `@lazy()` 标记的元素类，
//! `GemServerElement` 从导入 `server` 的模块导入，`defineLazy` 从导入 `lazy` 的模块导入
//!
//! - `@server()`：纯服务端元素，类替换成只保留 `@customElement` 的 `GemServerElement` 子类，
//!   然后移除不再使用的顶层声明和导入，例如只在服务端使用的 `marked`
//! - `@lazy()`：延时视图，模块替换成 `defineLazy(tag, () => import('./self?gem-lazy'), options)`，
//!   `options` 是 `@lazy()` 的参数，只能是字面量，例如 `{ on: 'visible' }`，
//!   带 `?gem-lazy` 的模块（`LazyChunk`）是元素真正的代码，不改写延时视图

use std::{collections::HashSet, path::Path};

use serde::Deserialize;
use swc_common::{errors::HANDLER, Spanned, SyntaxContext, DUMMY_SP};
use swc_core::{
    atoms::Atom,
    ecma::visit::{noop_visit_mut_type, Visit, VisitMut, VisitWith},
    quote,
};
use swc_ecma_ast::{
    Class, ClassDecl, Decl, DefaultDecl, ExportDecl, ExportDefaultDecl, Expr, Ident, ImportDecl,
    ImportNamedSpecifier, ImportSpecifier, Lit, ModuleDecl, ModuleExportName, ModuleItem, Pat,
    Prop, PropName, PropOrSpread, Stmt, Str, VarDecl,
};

use super::hash_string;

#[derive(Deserialize, Debug, Clone, Copy, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum SsrTarget {
    Server,
    Client,
    /// 客户端构建中延时视图元素真正的代码（`?gem-lazy` 模块），由 `unplugin-gem` 设置
    LazyChunk,
}

/// `true` 等同于 `"server"`，只添加 store 的 key，不改写元素
#[derive(Deserialize, Debug, Clone, PartialEq, Default)]
#[serde(untagged)]
pub enum SsrConfig {
    #[default]
    Disabled,
    Enabled(bool),
    Target(SsrTarget),
}

impl SsrConfig {
    pub fn target(&self) -> Option<SsrTarget> {
        match self {
            SsrConfig::Disabled | SsrConfig::Enabled(false) => None,
            SsrConfig::Enabled(true) => Some(SsrTarget::Server),
            SsrConfig::Target(target) => Some(*target),
        }
    }
}

static SERVER_ELEMENT: &str = "_GemServerElement";
static DEFINE_LAZY: &str = "_defineLazy";
/// 第二个参数是 key 的函数
static KEYED_FNS: [&str; 4] = [
    "createStore",
    "createTheme",
    "createScopedTheme",
    "createDecoratorTheme",
];

struct TransformVisitor {
    filename: String,
    target: SsrTarget,
}

fn get_call_name(expr: &Expr) -> Option<&Atom> {
    expr.as_call()?
        .callee
        .as_expr()?
        .as_ident()
        .map(|ident| &ident.sym)
}

static LAZY_ON: [&str; 3] = ["interaction", "load", "visible"];

/// `@lazy()` 的参数，改写后的模块需要知道，所以只能是 `{ on: 'visible' }` 这样的字面量，不合法时报错
fn get_lazy_options(expr: &Expr) -> Result<Option<Expr>, ()> {
    let Some(arg) = expr.as_call().and_then(|call| call.args.first()) else {
        return Ok(None);
    };
    let valid = arg.spread.is_none()
        && arg.expr.as_object().is_some_and(|obj| {
            obj.props.iter().all(|prop| {
                let PropOrSpread::Prop(prop) = prop else {
                    return false;
                };
                let Prop::KeyValue(kv) = &**prop else {
                    return false;
                };
                let is_on = match &kv.key {
                    PropName::Ident(key) => &*key.sym == "on",
                    PropName::Str(key) => key.value.as_str() == Some("on"),
                    _ => false,
                };
                is_on
                    && matches!(&*kv.value, Expr::Lit(Lit::Str(value))
                        if value.value.as_str().is_some_and(|v| LAZY_ON.contains(&v)))
            })
        });
    if valid {
        return Ok(Some((*arg.expr).clone()));
    }
    HANDLER.with(|handler| {
        handler
            .struct_span_err(
                arg.expr.span(),
                "the options of `@lazy()` must be a literal, e.g. `{ on: 'visible' }`, `on` is one of `interaction`, `load` and `visible`",
            )
            .emit()
    });
    Err(())
}

fn get_tag(expr: &Expr) -> Option<String> {
    let arg = expr.as_call()?.args.first()?;
    let Expr::Lit(Lit::Str(value)) = &*arg.expr else {
        return None;
    };
    value.value.as_str().map(String::from)
}

fn get_class(item: &mut ModuleItem) -> Option<&mut Class> {
    match item {
        ModuleItem::Stmt(Stmt::Decl(Decl::Class(ClassDecl { class, .. })))
        | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
            decl: Decl::Class(ClassDecl { class, .. }),
            ..
        })) => Some(class),
        ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(ExportDefaultDecl {
            decl: DefaultDecl::Class(class_expr),
            ..
        })) => Some(&mut class_expr.class),
        _ => None,
    }
}

fn named_import(local: &str, imported: &str, src: &str) -> ModuleItem {
    ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
        specifiers: vec![ImportSpecifier::Named(ImportNamedSpecifier {
            local: Ident::new(local.into(), DUMMY_SP, SyntaxContext::empty()),
            span: DUMMY_SP,
            imported: Some(ModuleExportName::Ident(Ident::new(
                imported.into(),
                DUMMY_SP,
                SyntaxContext::empty(),
            ))),
            is_type_only: false,
        })],
        src: Box::new(Str::from(src)),
        span: DUMMY_SP,
        type_only: false,
        with: None,
        phase: Default::default(),
    }))
}

fn is_value_export(item: &ModuleItem) -> bool {
    match item {
        ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl { decl, .. })) => {
            !matches!(decl, Decl::TsInterface(_) | Decl::TsTypeAlias(_))
        }
        ModuleItem::ModuleDecl(ModuleDecl::ExportNamed(named)) => !named.type_only,
        ModuleItem::ModuleDecl(
            ModuleDecl::ExportDefaultDecl(_)
            | ModuleDecl::ExportDefaultExpr(_)
            | ModuleDecl::ExportAll(_),
        ) => true,
        _ => false,
    }
}

fn is_element(item: &ModuleItem) -> bool {
    let mut item = item.clone();
    get_class(&mut item).is_some_and(|class| {
        class.decorators.iter().any(|decorator| {
            get_call_name(&decorator.expr).is_some_and(|name| &**name == "customElement")
        })
    })
}

/// 导入 `name` 的本地名称和模块
fn find_import(items: &[ModuleItem], name: &str) -> Option<(Atom, String)> {
    items.iter().find_map(|item| {
        let import = item.as_module_decl()?.as_import()?;
        import.specifiers.iter().find_map(|specifier| {
            let ImportSpecifier::Named(named) = specifier else {
                return None;
            };
            let imported = match &named.imported {
                Some(ModuleExportName::Ident(ident)) => &ident.sym,
                Some(_) => return None,
                None => &named.local.sym,
            };
            (&**imported == name).then(|| {
                (
                    named.local.sym.clone(),
                    import.src.value.as_str().unwrap_or_default().to_string(),
                )
            })
        })
    })
}

#[derive(Default)]
struct IdentCollector(HashSet<Atom>);

impl Visit for IdentCollector {
    fn visit_ident(&mut self, node: &Ident) {
        self.0.insert(node.sym.clone());
    }
}

fn collect_idents(item: &ModuleItem) -> HashSet<Atom> {
    let mut collector = IdentCollector::default();
    item.visit_with(&mut collector);
    collector.0
}

/// 可以移除的顶层声明的名称，导出的声明不移除
fn get_decl_names(item: &ModuleItem) -> Option<Vec<Atom>> {
    match item.as_stmt()?.as_decl()? {
        Decl::Var(var) => Some(
            var.decls
                .iter()
                .map(|decl| decl.name.as_ident().map(|ident| ident.sym.clone()))
                .collect::<Option<Vec<_>>>()?,
        ),
        Decl::Fn(func) => Some(vec![func.ident.sym.clone()]),
        Decl::Class(class) => Some(vec![class.ident.sym.clone()]),
        _ => None,
    }
}

/// 移除没有被其他部分引用的顶层声明和导入，直到没有可以移除的
fn remove_unused(items: &mut Vec<ModuleItem>) {
    loop {
        let idents: Vec<_> = items.iter().map(collect_idents).collect();
        let is_used = |index: usize, name: &Atom| {
            idents
                .iter()
                .enumerate()
                .any(|(i, set)| i != index && set.contains(name))
        };
        let mut removed = false;
        let mut index = 0;
        items.retain_mut(|item| {
            let current = index;
            index += 1;
            if let Some(import) = item
                .as_mut_module_decl()
                .and_then(|decl| decl.as_mut_import())
            {
                // 只有副作用的导入保留
                if import.specifiers.is_empty() {
                    return true;
                }
                let len = import.specifiers.len();
                import
                    .specifiers
                    .retain(|specifier| is_used(current, &specifier.local().sym));
                removed |= import.specifiers.len() != len;
                return !import.specifiers.is_empty();
            }
            let Some(names) = get_decl_names(item) else {
                return true;
            };
            let keep = names.iter().any(|name| is_used(current, name));
            removed |= !keep;
            keep
        });
        if !removed {
            break;
        }
    }
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
            let is_keyed = call
                .callee
                .as_expr()
                .and_then(|callee| callee.as_ident())
                .is_some_and(|ident| KEYED_FNS.contains(&&*ident.sym));
            if !is_keyed || call.args.len() != 1 {
                continue;
            }
            let key = format!("{:x}_{}", hash_string(&self.filename), name.id.sym);
            call.args.push(Expr::Lit(Lit::Str(key.into())).into());
        }
    }

    /// 改写 `@server()` `@lazy()` 标记的元素类，模块替换成延时视图的注册时返回 `true`
    fn rewrite_elements(&self, items: &mut Vec<ModuleItem>) -> bool {
        let server_import = find_import(items, "server");
        let lazy_import = find_import(items, "lazy");
        if server_import.is_none() && lazy_import.is_none() {
            return false;
        }
        let find_decorator = |class: &Class, import: &Option<(Atom, String)>| {
            import.as_ref().and_then(|(local, _)| {
                class
                    .decorators
                    .iter()
                    .find(|decorator| get_call_name(&decorator.expr) == Some(local))
                    .map(|decorator| (*decorator.expr).clone())
            })
        };
        let mut lazy_tag = None;
        let mut lazy_options = None;
        let mut lazy_index = 0;
        let mut replaced = false;
        for (index, item) in items.iter_mut().enumerate() {
            let Some(class) = get_class(item) else {
                continue;
            };
            let lazy = find_decorator(class, &lazy_import);
            if lazy.is_none() && find_decorator(class, &server_import).is_none() {
                continue;
            }
            let Some(define) = class
                .decorators
                .iter()
                .find(|decorator| {
                    get_call_name(&decorator.expr).is_some_and(|name| &**name == "customElement")
                })
                .cloned()
            else {
                continue;
            };
            if let Some(lazy) = lazy {
                if self.target != SsrTarget::LazyChunk {
                    let Ok(options) = get_lazy_options(&lazy) else {
                        return false;
                    };
                    lazy_tag = get_tag(&define.expr);
                    lazy_options = options;
                    lazy_index = index;
                }
                continue;
            }
            class.decorators = vec![define];
            class.body = vec![];
            class.implements = vec![];
            class.super_type_params = None;
            class.super_class = Some(Box::new(Expr::Ident(Ident::new(
                SERVER_ELEMENT.into(),
                DUMMY_SP,
                SyntaxContext::empty(),
            ))));
            replaced = true;
        }

        if let Some(tag) = lazy_tag {
            // 模块会被整个替换，其他导出和元素会丢失
            if let Some(other) = items.iter().enumerate().find(|(index, item)| {
                *index != lazy_index && (is_value_export(item) || is_element(item))
            }) {
                HANDLER.with(|handler| {
                    handler
                        .struct_span_err(
                            other.1.span(),
                            "a module with `@lazy()` element can not have other exports or elements",
                        )
                        .emit()
                });
                return false;
            }
            let Some(file_name) = Path::new(&self.filename)
                .file_name()
                .and_then(|name| name.to_str())
            else {
                return false;
            };
            let (_, src) = lazy_import.unwrap();
            let define = Ident::new(DEFINE_LAZY.into(), DUMMY_SP, SyntaxContext::empty());
            let tag = Expr::Lit(Lit::Str(tag.into()));
            let path = Expr::Lit(Lit::Str(format!("./{file_name}?gem-lazy").into()));
            *items = vec![
                named_import(DEFINE_LAZY, "defineLazy", &src),
                match lazy_options {
                    Some(options) => quote!(
                        "$define($tag, () => import($path), $options);" as ModuleItem,
                        define: Ident = define,
                        tag: Expr = tag,
                        path: Expr = path,
                        options: Expr = options,
                    ),
                    None => quote!(
                        "$define($tag, () => import($path));" as ModuleItem,
                        define: Ident = define,
                        tag: Expr = tag,
                        path: Expr = path,
                    ),
                },
            ];
            return true;
        }

        if replaced {
            let (_, src) = server_import.unwrap();
            remove_unused(items);
            items.insert(0, named_import(SERVER_ELEMENT, "GemServerElement", &src));
        }
        false
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_module_items(&mut self, items: &mut Vec<ModuleItem>) {
        if self.target != SsrTarget::Server && self.rewrite_elements(items) {
            return;
        }
        for item in items.iter_mut() {
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

pub fn ssr_transform(filename: Option<String>, target: SsrTarget) -> impl VisitMut {
    TransformVisitor {
        filename: filename.unwrap_or_default(),
        target,
    }
}
