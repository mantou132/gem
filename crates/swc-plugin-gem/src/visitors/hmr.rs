//! Gem 元素 HMR 的编译期转换，运行时见 `@mantou/gem/helper/hmr`。
//!
//! # 设计思路
//!
//! 自定义元素无法热替换类：
//!
//! - 同一个标签名只能 `customElements.define` 一次，已有实例和之后创建的实例
//!   都只能使用第一次注册的类
//! - ES 私有成员绑定在某一次类求值上，新类的方法无法访问老实例的 `#x`
//! - 箭头函数字段在构造时绑定到实例，`@effect`、`@template` 等装饰器也在构造时
//!   捕获函数引用，替换原型上的方法不会影响它们
//!
//! 所以模块重新执行得到的新类只作为“补丁来源”：运行时把新类的成员合并到已注册的
//! 老类上，已有实例和状态保持不变。本转换负责把类改写成可以被这样合并的形式，
//! 并告诉运行时哪些变化无法合并、需要刷新页面。
//!
//! # 编译期实现
//!
//! - 私有成员公开化：`#x` 改为 `_private_{key}_x`，`#x in obj` 改为
//!   `"_private_{key}_x" in obj`。`key` 是标签名（`-` 换成 `_`），没有
//!   `@customElement` 的类使用 `hash_{文件名和类序号的哈希}`，用于基类等
//! - 函数成员（方法、getter/setter、箭头函数字段、构造函数，包括静态和私有的）
//!   拆成“代理 + 影子方法”：原位置保留代理，函数体移到
//!   `_hmr_{public|private}_{key}_{name}[_get|_set]` 影子方法中。代理每次调用都
//!   通过 `this._hmr_xxx(...)` 动态查找，运行时替换老类上的影子方法即可生效，
//!   已绑定的箭头函数字段和装饰器捕获的引用也会调用到新代码。生成器和 async
//!   修饰保留在影子方法上，代理直接返回其结果。构造函数的代理只调用无参
//!   `super()`，再调用影子方法
//! - 非函数字段以 `[name, kind, isStatic]` 记录到静态字段 `_defined_fields_`，
//!   `kind` 来自第一个标识符形式的装饰器（`attribute`、`property`、`state`、
//!   `part`、`slot` 等，其他为 `other`），运行时据此增删字段
//! - 追加类装饰器 `_hmrRegisterClass(key)`。它是最内层装饰器，最先执行，
//!   运行时以 `key` 找到老类并合并
//! - 模块顶层 `const x = createStore(...)` 改为
//!   `_hmrKeep("{文件哈希}_x", () => createStore(...))`，模块重新执行时返回同一个
//!   store，元素的订阅和状态得以保留。没有使用 `hot.data`，因为 Rspack 不支持
//!   `import.meta.webpackHot.data`（会被编译成 `undefined`）
//! - 调用 HMR API：模块中有元素且不需要刷新时 `accept`；需要刷新时
//!   webpack/`module.hot` 使用 `decline`，`import.meta.hot` 没有 `decline`，
//!   不生成调用；没有元素且不需要刷新的模块不生成调用，由 host 冒泡给导入它的
//!   模块
//!
//! `@effect`/`@memo` 的依赖函数会被 `memo` 转换提升为静态方法 `_dep_fn_N`，
//! 因此也会生成影子方法，依赖的修改可以热更新。
//!
//! # 运行时配合
//!
//! 运行时比较新老类的影子方法名、`_defined_fields_` 和元数据，能合并时：
//! 替换全部影子方法（让所有方法引用新模块的变量）、通过重放字段装饰器增删字段、
//! 同步元数据，然后重新渲染已有实例。类装饰器返回一个 `Proxy`，使新模块中的
//! `new MyElement()` 构造已注册的老类；模板字符串按内容复用老对象，未修改的模板
//! 不会重建 DOM。
//!
//! # 刷新页面的条件
//!
//! 编译期（`need_reload`，作用于整个模块）：
//!
//! - `@connectStore` 的参数是本地变量且不是被保留的 `createStore`
//! - 模块中出现 `new.target` 或带参数的 `super(...)`
//! - 构造函数有 TS 参数属性或带值的 `return`
//! - 类没有 `@customElement` 且没有文件名（无法生成稳定的 `key`）
//!
//! 运行时：增删函数成员、增删 `other` 实例字段、修改 `mode`/`penetrable`/
//! `noBlocking`、连接的 store 不是同一对象。
//!
//! # 技术限制
//!
//! - `need_reload` 是模块级的：一个类需要刷新时，之后的类不再转换，整个模块
//!   拒绝更新
//! - Vite 没有 `decline`：需要刷新的模块如果被另一个会 `accept` 的模块导入，
//!   更新停在导入方，修改被忽略而不会刷新
//! - 计算属性名的成员不转换，不能热更新
//! - 私有名按最内层类改写，嵌套类访问外层类的 `#x` 会被改错
//! - 构造函数中定义嵌套类时，嵌套类构造函数之后的 `return` 检测不到
//! - 私有成员公开化后外部可以访问，`#x in obj` 变成字符串属性检查
//! - `_hmrKeep` 只识别直接调用 `createStore` 标识符，别名导入或 `gem.createStore`
//!   不会被保留；同一文件在页面中被加载两次时会共享同一个 store
//! - 除依赖函数外，装饰器参数只在类定义时求值一次，修改不生效
//! - 新实例仍由老类构造，字段初始值的修改不生效；新增的 attribute 不在浏览器
//!   注册时的 `observedAttributes` 中，运行时改为首次读取属性时从 DOM 获取初始值
//! - 静态字段值只对通过新模块类名读取生效，`this.constructor` 仍是老类
//! - 修改过的模板字面量是新的模板，对应 DOM 会重建

use std::{
    hash::{DefaultHasher, Hash, Hasher},
    mem, vec,
};

use indexmap::IndexSet;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use swc_common::DUMMY_SP;
use swc_core::{
    atoms::Atom,
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
    quote,
};
use swc_ecma_ast::{
    op, ArrayLit, ArrowExpr, BinExpr, BlockStmt, BlockStmtOrExpr, CallExpr, Callee, Class,
    ClassMember, ClassMethod, ClassProp, Constructor, Decl, Decorator, ExportDecl, Expr,
    ExprOrSpread, Function, Ident, IdentName, ImportSpecifier, Lit, MemberExpr, MemberProp,
    MetaPropKind, MethodKind, ModuleDecl, ModuleItem, Param, ParamOrTsParamProp, Pat, PropName,
    RestPat, ReturnStmt, StaticBlock, Stmt, Str, ThisExpr, VarDecl,
};

#[derive(Deserialize, Debug, Clone, Copy, PartialEq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum HmrTarget {
    #[default]
    WebpackHot,
    ImportMetaHot,
    ModuleHot,
    None,
}

#[derive(Deserialize, Debug, Clone, PartialEq, Default)]
#[serde(untagged)]
pub enum HmrConfig {
    #[default]
    Disabled,
    Enabled(bool),
    Target(HmrTarget),
}

impl HmrConfig {
    pub fn target(&self) -> Option<HmrTarget> {
        match self {
            HmrConfig::Disabled => None,
            HmrConfig::Enabled(false) => None,
            HmrConfig::Enabled(true) => Some(HmrTarget::WebpackHot),
            HmrConfig::Target(HmrTarget::None) => None,
            HmrConfig::Target(target) => Some(*target),
        }
    }
}

static DASH_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"-").unwrap());
static HASH_KEY_PREFIX: &str = "hash_";
static KEEP_FNS: [&str; 1] = ["createStore"];

fn hash_string(s: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    hasher.finish()
}

#[derive(Default)]
struct TransformVisitor {
    filename: String,
    class_index: usize,
    has_element: bool,
    class_stack: Vec<String>,
    need_reload: bool,
    imported_names: IndexSet<Atom>,
    kept_names: IndexSet<Atom>,
    target: HmrTarget,
    // 用来判断构造函数是否有带值的 `return`，进入内部函数时会暂时重置
    in_constructor: bool,
}

impl TransformVisitor {
    fn keep_var_decl(&mut self, var: &mut VarDecl) {
        if self.filename.is_empty() {
            return;
        }
        for decl in var.decls.iter_mut() {
            let (Pat::Ident(name), Some(init)) = (&decl.name, &mut decl.init) else {
                continue;
            };
            let is_keep_call = init
                .as_call()
                .and_then(|call| call.callee.as_expr())
                .and_then(|callee| callee.as_ident())
                .is_some_and(|ident| KEEP_FNS.contains(&ident.sym.as_str()));
            if !is_keep_call {
                continue;
            }
            let sym = name.id.sym.clone();
            // 不使用 `hot.data`，Rspack 不支持 `import.meta.webpackHot.data`
            let key = format!("{:x}_{}", hash_string(&self.filename), sym);
            let origin = mem::take(&mut **init);
            **init = quote!(
                "(globalThis._hmrKeep || ((_, fn) => fn()))($key, () => $init)" as Expr,
                key: Expr = Expr::Lit(Lit::Str(key.into())),
                init: Expr = origin,
            );
            self.kept_names.insert(sym);
        }
    }

    fn get_current_tag_name(&self) -> &str {
        self.class_stack.last().unwrap()
    }

    fn store_arg_is_local(&self, expr: &Expr) -> bool {
        match expr {
            Expr::Ident(ident) => {
                !self.imported_names.contains(&ident.sym) && !self.kept_names.contains(&ident.sym)
            }
            Expr::Member(member) => match &*member.obj {
                Expr::Ident(ident) => !self.imported_names.contains(&ident.sym),
                _ => true,
            },
            _ => true,
        }
    }

    fn get_class_name(&mut self, node: &mut Class) -> String {
        let tag_name = node
            .decorators
            .iter()
            .find(|x| {
                if let Some(call_expr) = x.expr.as_call() {
                    if let Callee::Expr(b) = &call_expr.callee {
                        if let Some(Ident { sym, .. }) = b.as_ident() {
                            if sym.as_str() == "customElement" {
                                return true;
                            }
                        }
                    }
                }
                false
            })
            .map(|x| {
                if let Some(ExprOrSpread { expr, .. }) = x.expr.as_call().unwrap().args.first() {
                    if let Some(Lit::Str(tag_name)) = expr.as_lit() {
                        return tag_name.value.as_str().unwrap_or_default().to_string();
                    }
                }
                Default::default()
            });
        if let Some(tag_name) = tag_name {
            return tag_name;
        }
        if self.filename.is_empty() {
            return String::new();
        }
        self.class_index += 1;
        format!(
            "{}{:x}",
            HASH_KEY_PREFIX,
            hash_string(&format!("{}{}", self.filename, self.class_index))
        )
    }
}

fn get_shadow_ident(
    origin_ident: &IdentName,
    key: &str,
    is_private: bool,
    method_kind: MethodKind,
) -> IdentName {
    let kind_suffix = match method_kind {
        MethodKind::Getter => "_get",
        MethodKind::Setter => "_set",
        MethodKind::Method => "",
    };
    format!(
        "_hmr_{}_{}_{}{}",
        if is_private { "private" } else { "public" },
        &DASH_REG.replace_all(key, "_"),
        origin_ident.as_ref(),
        kind_suffix,
    )
    .into()
}

fn get_private_ident(origin_ident: &IdentName, key: &str) -> IdentName {
    format!(
        "_private_{}_{}",
        &DASH_REG.replace_all(key, "_"),
        origin_ident.as_ref()
    )
    .into()
}

fn gen_shadow_member(
    shadow_ident: &IdentName,
    is_static: bool,
    body: Option<BlockStmt>,
    params: Vec<Param>,
    is_async: bool,
    is_generator: bool,
) -> ClassMember {
    ClassMember::Method(ClassMethod {
        is_static,
        key: PropName::Ident(shadow_ident.clone()),
        function: Box::new(Function {
            is_async,
            is_generator,
            params,
            body,
            ..Default::default()
        }),
        ..Default::default()
    })
}

fn gen_proxy_arg() -> Vec<Pat> {
    vec![Pat::Rest(RestPat {
        arg: Box::new(Pat::Ident("args".into())),
        dot3_token: DUMMY_SP,
        span: DUMMY_SP,
        type_ann: None,
    })]
}

fn gen_proxy_this_expr(shadow_ident: &IdentName) -> Expr {
    Expr::Member(MemberExpr {
        obj: Box::new(Expr::This(ThisExpr { span: DUMMY_SP })),
        prop: MemberProp::Ident(shadow_ident.clone()),
        ..Default::default()
    })
}

fn gen_proxy_body(shadow_ident: &IdentName) -> BlockStmt {
    let this_expr = gen_proxy_this_expr(shadow_ident);
    BlockStmt {
        stmts: vec![quote!(
            "return $expr(...args);" as Stmt,
            expr: Expr = this_expr
        )],
        ..Default::default()
    }
}

fn gen_proxy_body_getter(shadow_ident: &IdentName) -> BlockStmt {
    let this_expr = gen_proxy_this_expr(shadow_ident);
    BlockStmt {
        stmts: vec![quote!(
            "return $expr();" as Stmt,
            expr: Expr = this_expr
        )],
        ..Default::default()
    }
}

fn gen_proxy_body_setter(shadow_ident: &IdentName) -> BlockStmt {
    let this_expr = gen_proxy_this_expr(shadow_ident);
    BlockStmt {
        stmts: vec![quote!(
            "$expr(value);" as Stmt,
            expr: Expr = this_expr
        )],
        ..Default::default()
    }
}

fn gen_proxy_body_constructor(shadow_ident: &IdentName, has_super: &bool) -> BlockStmt {
    let this_expr = gen_proxy_this_expr(shadow_ident);
    let mut stmts = vec![];
    if *has_super {
        stmts.push(quote!("super();" as Stmt));
    }
    stmts.push(quote!(
        "$expr(...args);" as Stmt,
        expr: Expr = this_expr
    ));
    BlockStmt {
        stmts,
        ..Default::default()
    }
}

fn replace_to_proxy_function(
    func: &mut Function,
    shadow_ident: &IdentName,
    is_getter: bool,
    is_setter: bool,
) -> (Option<BlockStmt>, Vec<Param>) {
    if is_getter {
        return (
            mem::replace(&mut func.body, gen_proxy_body_getter(shadow_ident).into()),
            vec![],
        );
    }
    if is_setter {
        // setter 必须有且仅有一个参数，不能用 rest，否则下游解析会失败
        return (
            mem::replace(&mut func.body, gen_proxy_body_setter(shadow_ident).into()),
            mem::replace(
                &mut func.params,
                vec![Param::from(Pat::Ident("value".into()))],
            ),
        );
    }
    (
        mem::replace(&mut func.body, gen_proxy_body(shadow_ident).into()),
        mem::replace(
            &mut func.params,
            gen_proxy_arg().drain(..).map(|x| x.into()).collect(),
        ),
    )
}

fn replace_to_proxy_function_for_constructor(
    constructor: &mut Constructor,
    shadow_ident: &IdentName,
    has_super: &bool,
) -> (Option<BlockStmt>, Vec<Param>) {
    let body = mem::replace(
        &mut constructor.body,
        gen_proxy_body_constructor(shadow_ident, has_super).into(),
    );
    let mut params = mem::replace(
        &mut constructor.params,
        gen_proxy_arg()
            .drain(..)
            .map(|x| ParamOrTsParamProp::Param(x.into()))
            .collect(),
    );
    (
        body.map(|mut b| BlockStmt {
            stmts: b
                .stmts
                .drain(..)
                .filter(|stmt| {
                    if let Stmt::Expr(stmt_expr) = stmt {
                        if let Some(call) = stmt_expr.expr.as_call() {
                            if let Callee::Super(_) = call.callee {
                                return false;
                            }
                        }
                    }
                    true
                })
                .collect(),
            ..b
        }),
        params
            .drain(..)
            .map(|param| {
                if let ParamOrTsParamProp::Param(p) = param {
                    p
                } else {
                    unreachable!()
                }
            })
            .collect(),
    )
}

fn replace_to_proxy_arrow(
    func: &mut ArrowExpr,
    shadow_ident: &IdentName,
) -> (BlockStmt, Vec<Param>) {
    let origin_body = mem::replace(
        &mut func.body,
        Box::new(BlockStmtOrExpr::BlockStmt(gen_proxy_body(shadow_ident))),
    );
    (
        match *origin_body {
            BlockStmtOrExpr::BlockStmt(body) => body,
            BlockStmtOrExpr::Expr(expr) => BlockStmt {
                stmts: vec![quote!(
                    "return $expr;" as Stmt,
                    expr: Expr = *expr
                )],
                ..Default::default()
            },
        },
        mem::replace(&mut func.params, gen_proxy_arg())
            .drain(..)
            .map(|x| x.into())
            .collect(),
    )
}

fn transform_fn(
    node: ClassMember,
    key: &str,
    has_super: &bool,
) -> (ClassMember, Option<ClassMember>) {
    match node {
        ClassMember::Constructor(mut constructor) => {
            let shadow_ident = get_shadow_ident(
                &IdentName::from("constructor"),
                key,
                false,
                MethodKind::Method,
            );
            let (body, params) = replace_to_proxy_function_for_constructor(
                &mut constructor,
                &shadow_ident,
                has_super,
            );
            (
                ClassMember::Constructor(Constructor { ..constructor }),
                Some(gen_shadow_member(
                    &shadow_ident,
                    false,
                    body,
                    params,
                    false,
                    false,
                )),
            )
        }
        ClassMember::Method(mut method) => {
            if let Some(origin_ident) = method.key.as_ident() {
                let shadow_ident = get_shadow_ident(origin_ident, key, false, method.kind);
                let (body, params) = replace_to_proxy_function(
                    &mut method.function,
                    &shadow_ident,
                    method.kind == MethodKind::Getter,
                    method.kind == MethodKind::Setter,
                );
                // 代理直接返回影子方法的结果（Promise/迭代器）
                let is_async = mem::take(&mut method.function.is_async);
                let is_generator = mem::take(&mut method.function.is_generator);
                (
                    ClassMember::Method(ClassMethod { ..method }),
                    Some(gen_shadow_member(
                        &shadow_ident,
                        method.is_static,
                        body,
                        params,
                        is_async,
                        is_generator,
                    )),
                )
            } else {
                (ClassMember::Method(method), None)
            }
        }
        ClassMember::PrivateMethod(mut method) => {
            let origin_ident = IdentName::new(method.key.name, DUMMY_SP);
            let private_ident = PropName::Ident(get_private_ident(&origin_ident, key));
            let shadow_ident = get_shadow_ident(&origin_ident, key, true, method.kind);
            let (body, params) = replace_to_proxy_function(
                &mut method.function,
                &shadow_ident,
                method.kind == MethodKind::Getter,
                method.kind == MethodKind::Setter,
            );
            let is_async = mem::take(&mut method.function.is_async);
            let is_generator = mem::take(&mut method.function.is_generator);
            (
                ClassMember::Method(ClassMethod {
                    key: private_ident,
                    accessibility: method.accessibility,
                    is_abstract: method.is_abstract,
                    is_optional: method.is_optional,
                    is_override: method.is_override,
                    function: method.function,
                    is_static: method.is_static,
                    kind: method.kind,
                    span: method.span,
                }),
                Some(gen_shadow_member(
                    &shadow_ident,
                    method.is_static,
                    body,
                    params,
                    is_async,
                    is_generator,
                )),
            )
        }
        ClassMember::ClassProp(mut prop) => {
            // 计算属性名不支持
            if let (Some(origin_ident), Some(v)) = (prop.key.as_ident(), prop.value.as_mut()) {
                if let Some(func) = v.as_mut_arrow() {
                    let shadow_ident =
                        get_shadow_ident(origin_ident, key, false, MethodKind::Method);
                    let (body, params) = replace_to_proxy_arrow(func, &shadow_ident);
                    let is_async = func.is_async;
                    return (
                        ClassMember::ClassProp(ClassProp { ..prop }),
                        Some(gen_shadow_member(
                            &shadow_ident,
                            prop.is_static,
                            Some(body),
                            params,
                            is_async,
                            false,
                        )),
                    );
                }
            }
            (ClassMember::ClassProp(prop), None)
        }
        ClassMember::PrivateProp(mut prop) => {
            let origin_ident = IdentName::new(prop.key.name, DUMMY_SP);
            let private_ident = PropName::Ident(get_private_ident(&origin_ident, key));
            if let Some(ref mut v) = prop.value {
                if let Some(func) = v.as_mut_arrow() {
                    let shadow_ident =
                        get_shadow_ident(&origin_ident, key, true, MethodKind::Method);
                    let (body, params) = replace_to_proxy_arrow(func, &shadow_ident);
                    let is_async = func.is_async;
                    return (
                        ClassMember::ClassProp(ClassProp {
                            key: private_ident,
                            accessibility: prop.accessibility,
                            is_optional: prop.is_optional,
                            is_override: prop.is_override,
                            is_static: prop.is_static,
                            span: prop.span,
                            decorators: prop.decorators,
                            definite: prop.definite,
                            readonly: prop.readonly,
                            value: prop.value,
                            type_ann: prop.type_ann,
                            ..Default::default()
                        }),
                        Some(gen_shadow_member(
                            &shadow_ident,
                            prop.is_static,
                            Some(body),
                            params,
                            is_async,
                            false,
                        )),
                    );
                }
            }
            (
                ClassMember::ClassProp(ClassProp {
                    key: private_ident,
                    accessibility: prop.accessibility,
                    is_optional: prop.is_optional,
                    is_override: prop.is_override,
                    is_static: prop.is_static,
                    span: prop.span,
                    decorators: prop.decorators,
                    definite: prop.definite,
                    readonly: prop.readonly,
                    value: prop.value,
                    type_ann: prop.type_ann,
                    ..Default::default()
                }),
                None,
            )
        }
        _ => (node, None),
    }
}

#[derive(Default)]
struct FieldProp {
    name: String,
    kind: String,
    is_static: bool,
}

impl FieldProp {
    fn new(name: &str, kind: &str) -> FieldProp {
        FieldProp {
            name: name.to_string(),
            kind: kind.to_string(),
            ..Default::default()
        }
    }

    fn set_static(mut self, is_static: bool) -> FieldProp {
        self.is_static = is_static;
        self
    }
}

fn get_field_type(sym: &Atom, decorators: &Vec<Decorator>) -> FieldProp {
    let name = sym.as_str();
    for x in decorators {
        if let Some(ident) = x.expr.as_ident() {
            return match ident.sym.as_str() {
                kind @ ("attribute" | "boolattribute" | "numattribute" | "property" | "emitter"
                | "globalemitter" | "state" | "part" | "slot") => FieldProp::new(name, kind),
                _ => FieldProp::new(name, "other"),
            };
        }
    }
    FieldProp::new(name, "other")
}

fn get_field(origin_member: &ClassMember) -> Option<FieldProp> {
    match origin_member {
        ClassMember::ClassProp(prop) => {
            if let Some(ident) = prop.key.as_ident() {
                return Some(
                    get_field_type(&ident.sym, &prop.decorators).set_static(prop.is_static),
                );
            }
            None
        }
        ClassMember::PrivateProp(prop) => {
            Some(get_field_type(&prop.key.name, &prop.decorators).set_static(prop.is_static))
        }
        _ => None,
    }
}

fn gen_hmr_props(props: Vec<Option<FieldProp>>) -> ClassMember {
    let elements = props
        .iter()
        .filter(|x| x.is_some())
        .map(|x| {
            x.as_ref().map(
                |FieldProp {
                     name,
                     kind,
                     is_static,
                 }| {
                    let p_name = Expr::Lit(Lit::Str(name.clone().into()));
                    let p_type = Expr::Lit(Lit::Str(kind.clone().into()));
                    let p_static = Expr::Lit(Lit::Bool((*is_static).into()));
                    ExprOrSpread {
                        spread: None,
                        expr: Box::new(quote!(
                            "[$prop_name, $field_type, $is_static]" as Expr,
                            prop_name: Expr = p_name,
                            field_type: Expr = p_type,
                            is_static: Expr = p_static,
                        )),
                    }
                },
            )
        })
        .collect();
    let arr_expr = Expr::Array(ArrayLit {
        elems: elements,
        ..Default::default()
    });
    ClassMember::StaticBlock(StaticBlock {
        body: BlockStmt {
            stmts: vec![quote!(
                "this._defined_fields_ = $arr_expr;" as Stmt,
                arr_expr: Expr = arr_expr
            )],
            ..Default::default()
        },
        ..Default::default()
    })
}

fn gen_register_class(name: &str) -> Decorator {
    let name = Expr::Lit(Lit::Str(name.into()));
    Decorator {
        expr: Box::new(quote!(
            "(globalThis._hmrRegisterClass ? globalThis._hmrRegisterClass($key) : Function.prototype)" as Expr,
            key: Expr = name,
        )),
        ..Default::default()
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_member_expr(&mut self, node: &mut MemberExpr) {
        node.visit_mut_children_with(self);

        if let Some(private_name) = node.prop.as_private_name() {
            node.prop = MemberProp::Ident(get_private_ident(
                &IdentName::new(private_name.name.clone(), DUMMY_SP),
                self.get_current_tag_name(),
            ));
        }
    }

    fn visit_mut_bin_expr(&mut self, node: &mut BinExpr) {
        node.visit_mut_children_with(self);

        if node.op == op!("in") {
            if let Expr::PrivateName(private_name) = node.left.as_ref() {
                let private_ident = get_private_ident(
                    &IdentName::new(private_name.name.clone(), DUMMY_SP),
                    self.get_current_tag_name(),
                );
                *node.left = Expr::Lit(Lit::Str(Str::from(private_ident.sym.clone())));
            }
        }
    }

    fn visit_mut_constructor(&mut self, node: &mut Constructor) {
        self.in_constructor = true;
        node.visit_mut_children_with(self);
        self.in_constructor = false;
    }

    fn visit_mut_function(&mut self, node: &mut Function) {
        let saved = self.in_constructor;
        self.in_constructor = false;
        node.visit_mut_children_with(self);
        self.in_constructor = saved;
    }

    fn visit_mut_arrow_expr(&mut self, node: &mut ArrowExpr) {
        let saved = self.in_constructor;
        self.in_constructor = false;
        node.visit_mut_children_with(self);
        self.in_constructor = saved;
    }

    fn visit_mut_param_or_ts_param_prop(&mut self, node: &mut ParamOrTsParamProp) {
        if let ParamOrTsParamProp::TsParamProp(_) = node {
            if self.in_constructor {
                self.need_reload = true;
            }
        }
    }

    fn visit_mut_call_expr(&mut self, node: &mut CallExpr) {
        node.visit_mut_children_with(self);

        if let Callee::Super(_) = node.callee {
            if !node.args.is_empty() {
                self.need_reload = true;
            }
        }
    }

    fn visit_mut_import_specifier(&mut self, node: &mut ImportSpecifier) {
        self.imported_names.insert(node.local().sym.clone());
        node.visit_mut_children_with(self);
    }

    fn visit_mut_meta_prop_kind(&mut self, node: &mut MetaPropKind) {
        if node == &MetaPropKind::NewTarget {
            self.need_reload = true;
        }
    }

    fn visit_mut_return_stmt(&mut self, node: &mut ReturnStmt) {
        node.visit_mut_children_with(self);

        if self.in_constructor && node.arg.is_some() {
            self.need_reload = true;
        }
    }

    fn visit_mut_class(&mut self, node: &mut Class) {
        let has_super = node.super_class.is_some();
        let class_name = self.get_class_name(node);

        if !class_name.is_empty() {
            self.class_stack.push(class_name.clone());
            let snapshot = node.body.clone();
            node.visit_mut_children_with(self);
            self.class_stack.pop();

            if !self.need_reload {
                for decorator in &node.decorators {
                    if let Some(call) = decorator.expr.as_call() {
                        if let Callee::Expr(callee) = &call.callee {
                            if let Some(Ident { sym, .. }) = callee.as_ident() {
                                if sym.as_str() == "connectStore" {
                                    if let Some(ExprOrSpread { expr, .. }) = call.args.first() {
                                        if self.store_arg_is_local(expr) {
                                            self.need_reload = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if self.need_reload {
                node.body = snapshot;
                return;
            }

            if !class_name.starts_with(HASH_KEY_PREFIX) {
                self.has_element = true;
            }

            let mut props = vec![];
            let mut body = vec![];
            while let Some(item) = node.body.pop() {
                let (origin_member, append) = transform_fn(item, &class_name, &has_super);

                // 不是函数成员，进行记录
                if append.is_none() {
                    props.push(get_field(&origin_member));
                }

                body.push(origin_member);

                if let Some(shadow_member) = append {
                    body.push(shadow_member);
                }
            }
            body.reverse();
            node.body = body;

            node.body.push(gen_hmr_props(props));
            node.decorators.push(gen_register_class(&class_name));
        } else {
            self.need_reload = true;
        }
    }

    fn visit_mut_module_items(&mut self, node: &mut Vec<ModuleItem>) {
        // 先于类处理，`connectStore` 需要判断 store 是否被保留
        for item in node.iter_mut() {
            let var = match item {
                ModuleItem::Stmt(Stmt::Decl(Decl::Var(var))) => var,
                ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                    decl: Decl::Var(var),
                    ..
                })) => var,
                _ => continue,
            };
            self.keep_var_decl(var);
        }

        node.visit_mut_children_with(self);

        let Some(hot_expr) = gen_hot_expr(self.target) else {
            return;
        };

        if self.need_reload {
            // `import.meta.hot` 没有 `decline`，不接受即可让 host 冒泡或刷新
            if self.target == HmrTarget::ImportMetaHot {
                return;
            }
            node.push(quote!(
                "
                if ($hot) {
                    $hot.decline();
                }
                " as ModuleItem,
                hot: Expr = hot_expr
            ));
        } else if self.has_element {
            node.push(quote!(
                "
                if ($hot) {
                    $hot.accept();
                }
                " as ModuleItem,
                hot: Expr = hot_expr
            ));
        }
    }
}

fn gen_hot_expr(target: HmrTarget) -> Option<Expr> {
    match target {
        HmrTarget::None => None,
        HmrTarget::WebpackHot => Some(quote!("import.meta.webpackHot" as Expr)),
        HmrTarget::ImportMetaHot => Some(quote!("import.meta.hot" as Expr)),
        HmrTarget::ModuleHot => Some(quote!("module.hot" as Expr)),
    }
}

pub fn hmr_transform(filename: Option<String>, target: HmrTarget) -> impl VisitMut {
    TransformVisitor {
        filename: filename.unwrap_or_default(),
        target,
        ..Default::default()
    }
}
