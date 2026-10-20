//! SSR 支持
//!
//! 客户端和服务端构建：模块顶层 `const x = createStore(...)` 添加 key 参数，
//! 改为 `createStore(..., "{文件哈希}_x")`，服务端和客户端用 key 同步 store 的值
//! （只识别直接调用 `createStore` 标识符，和 HMR 保留 store 的规则一样，已经有第二个参数时不处理）；
//! `createTheme` `createScopedTheme` `createDecoratorTheme` 同样添加 key，用作 css 变量名的后缀
//!
//! 改写 `@server()` `@lazy()` `@client()` 标记的元素类，
//! `GemServerElement` 从导入 `server` 的模块导入，`defineLazy` 从导入 `lazy` 的模块导入
//!
//! - `@server()`：纯服务端元素，客户端构建时类替换成只保留 `@customElement` 的 `GemServerElement` 子类，
//!   然后移除不再使用的顶层声明和导入，例如只在服务端使用的 `marked`
//! - `@lazy()`：延时视图，客户端构建时模块替换成 `defineLazy(tag, () => import('./self?gem-lazy'), options)`，
//!   `options` 是 `@lazy()` 的参数，只能是字面量，例如 `{ on: 'visible' }`，
//!   带 `?gem-lazy` 的模块（`LazyChunk`）是元素真正的代码，不改写延时视图
//! - `@client()`：纯客户端元素，服务端构建时模块替换成空模块，模块中只在浏览器中运行的代码不会在服务端执行
//!
//! 这些装饰器只能用在有 `@customElement` 的类上（不能用在基类上），一个类只能用其中一个，
//! `@lazy()` `@client()` 会替换整个模块，所以模块中不能有其他导出或元素

use std::{collections::HashSet, path::Path};

use serde::Deserialize;
use swc_common::{errors::HANDLER, Span, Spanned, SyntaxContext, DUMMY_SP};
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
    /// 不知道是客户端还是服务端构建，只添加 key，不改写元素
    Unknown,
}

/// `true` 等同于 `"unknown"`
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
            SsrConfig::Enabled(true) => Some(SsrTarget::Unknown),
            SsrConfig::Target(target) => Some(*target),
        }
    }
}

static SERVER_ELEMENT: &str = "_GemServerElement";
/// 元素类装饰器，也是导入的名称
static ELEMENT_KINDS: [&str; 3] = ["server", "lazy", "client"];
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

fn emit_error(span: Span, msg: &str) {
    HANDLER.with(|handler| handler.struct_span_err(span, msg).emit());
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
    emit_error(
        arg.expr.span(),
        "the options of `@lazy()` must be a literal, e.g. `{ on: 'visible' }`, `on` is one of `interaction`, `load` and `visible`",
    );
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

    /// 检查并改写 `@server()` `@lazy()` `@client()` 标记的元素类，模块被整个替换时返回 `true`
    fn rewrite_elements(&self, items: &mut Vec<ModuleItem>) -> bool {
        let imports: Vec<_> = ELEMENT_KINDS
            .iter()
            .filter_map(|kind| find_import(items, kind).map(|import| (*kind, import)))
            .collect();
        if imports.is_empty() {
            return false;
        }
        // 替换整个模块的元素：类型、位置、`@customElement` 和元素类装饰器
        let mut module_element = None;
        let mut replaced = false;
        for (index, item) in items.iter_mut().enumerate() {
            let Some(class) = get_class(item) else {
                continue;
            };
            let decorators: Vec<_> = class
                .decorators
                .iter()
                .filter_map(|decorator| {
                    let name = get_call_name(&decorator.expr)?;
                    imports
                        .iter()
                        .find(|(_, (local, _))| local == name)
                        .map(|(kind, _)| (*kind, (*decorator.expr).clone()))
                })
                .collect();
            let Some((kind, decorator)) = decorators.first().cloned() else {
                continue;
            };
            if let Some((other, other_decorator)) = decorators.get(1) {
                emit_error(
                    other_decorator.span(),
                    &format!("`@{kind}()` and `@{other}()` can not be used on the same element"),
                );
                return false;
            }
            let Some(define) = class
                .decorators
                .iter()
                .find(|decorator| {
                    get_call_name(&decorator.expr).is_some_and(|name| &**name == "customElement")
                })
                .cloned()
            else {
                emit_error(
                    decorator.span(),
                    &format!(
                        "`@{kind}()` can only be used on the element class with `@customElement`"
                    ),
                );
                return false;
            };
            if kind != "server" {
                module_element = Some((kind, index, define.expr, decorator));
                continue;
            }
            if self.target != SsrTarget::Client {
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

        if let Some((kind, element_index, define, decorator)) = module_element {
            // 模块会被整个替换，其他导出和元素会丢失
            if let Some(other) = items.iter().enumerate().find(|(index, item)| {
                *index != element_index && (is_value_export(item) || is_element(item))
            }) {
                emit_error(
                    other.1.span(),
                    &format!(
                        "a module with `@{kind}()` element can not have other exports or elements"
                    ),
                );
                return false;
            }
            if kind == "client" {
                if self.target != SsrTarget::Server {
                    return false;
                }
                items.clear();
                return true;
            }
            let Ok(options) = get_lazy_options(&decorator) else {
                return false;
            };
            let Some(tag) = get_tag(&define) else {
                emit_error(
                    define.span(),
                    "the tag of `@lazy()` element must be a string literal",
                );
                return false;
            };
            if self.target != SsrTarget::Client {
                return false;
            }
            let Some(file_name) = Path::new(&self.filename)
                .file_name()
                .and_then(|name| name.to_str())
            else {
                return false;
            };
            let (_, (_, src)) = imports.iter().find(|(kind, _)| *kind == "lazy").unwrap();
            let define = Ident::new(DEFINE_LAZY.into(), DUMMY_SP, SyntaxContext::empty());
            let tag = Expr::Lit(Lit::Str(tag.into()));
            let path = Expr::Lit(Lit::Str(format!("./{file_name}?gem-lazy").into()));
            *items = vec![
                named_import(DEFINE_LAZY, "defineLazy", src),
                match options {
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
            let (_, (_, src)) = imports.iter().find(|(kind, _)| *kind == "server").unwrap();
            let src = src.clone();
            remove_unused(items);
            items.insert(0, named_import(SERVER_ELEMENT, "GemServerElement", &src));
        }
        false
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_module_items(&mut self, items: &mut Vec<ModuleItem>) {
        if self.target != SsrTarget::Unknown && self.rewrite_elements(items) {
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
