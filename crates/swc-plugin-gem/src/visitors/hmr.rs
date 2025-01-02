//! https://rspack.dev/api/runtime-api/hmr
//!
//! - 将私有成员转译成公开成员，同时修改所有私有成员访问
//! - 为函数成员（方法、getter、setter、字段，包括静态的）添加影子方法，
//!   在运行时进行替换，不支持计算属性名
//! - 调用 HMR API：模块中有元素定义就接受、否则冒泡
//! - 收集所有非函数字段名称及其装饰器，在运行时进行比较和更新

use std::{
    hash::{DefaultHasher, Hash, Hasher},
    mem, vec,
};

use once_cell::sync::Lazy;
use regex::Regex;
use swc_common::DUMMY_SP;
use swc_core::{
    atoms::Atom,
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
    quote,
};
use swc_ecma_ast::{
    ArrayLit, ArrowExpr, BlockStmt, BlockStmtOrExpr, Callee, Class, ClassMember, ClassMethod,
    ClassProp, Decorator, Expr, ExprOrSpread, Function, Ident, IdentName, Lit, MemberExpr,
    MemberProp, MethodKind, ModuleItem, Param, Pat, PropName, RestPat, StaticBlock, ThisExpr,
};

static DASH_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"-").unwrap());
static HASH_KEY_PREFIX: &str = "hash_";

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
}

impl TransformVisitor {
    fn get_current_tag_name(&self) -> &str {
        self.class_stack.last().unwrap()
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
                        return tag_name.value.to_string();
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

fn get_shadow_ident(origin_ident: &IdentName, key: &str, is_private: bool) -> IdentName {
    format!(
        "_hmr_{}_{}_{}",
        if is_private { "private" } else { "public" },
        &DASH_REG.replace_all(key, "_"),
        origin_ident.as_ref()
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
) -> ClassMember {
    ClassMember::Method(ClassMethod {
        is_static,
        key: PropName::Ident(shadow_ident.clone()),
        function: Box::new(Function {
            is_async,
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

fn gen_proxy_body(shadow_ident: &IdentName, is_getter: bool) -> BlockStmt {
    let this_expr = Expr::Member(MemberExpr {
        obj: Box::new(Expr::This(ThisExpr { span: DUMMY_SP })),
        prop: MemberProp::Ident(shadow_ident.clone()),
        ..Default::default()
    });
    BlockStmt {
        stmts: vec![if is_getter {
            quote!(
                "
                return $expr.bind(this)();
                " as Stmt,
                expr: Expr = this_expr
            )
        } else {
            quote!(
                "
                return $expr.bind(this)(...args);
                " as Stmt,
                expr: Expr = this_expr
            )
        }],
        ..Default::default()
    }
}

fn replace_to_proxy_function(
    func: &mut Function,
    shadow_ident: &IdentName,
    is_getter: bool,
) -> (Option<BlockStmt>, Vec<Param>) {
    if is_getter {
        return (
            mem::replace(&mut func.body, gen_proxy_body(shadow_ident, true).into()),
            vec![],
        );
    }
    (
        mem::replace(&mut func.body, gen_proxy_body(shadow_ident, false).into()),
        mem::replace(
            &mut func.params,
            gen_proxy_arg().drain(..).map(|x| x.into()).collect(),
        ),
    )
}

fn replace_to_proxy_arrow(
    func: &mut ArrowExpr,
    shadow_ident: &IdentName,
) -> (Box<BlockStmtOrExpr>, Vec<Param>) {
    (
        mem::replace(
            &mut func.body,
            Box::new(BlockStmtOrExpr::BlockStmt(gen_proxy_body(
                shadow_ident,
                false,
            ))),
        ),
        mem::replace(&mut func.params, gen_proxy_arg())
            .drain(..)
            .map(|x| x.into())
            .collect(),
    )
}

fn transform_fn(node: ClassMember, key: &str) -> (ClassMember, Option<ClassMember>) {
    match node {
        ClassMember::Method(mut method) => {
            if let Some(origin_ident) = method.key.as_ident() {
                let shadow_ident = get_shadow_ident(origin_ident, key, false);
                let (body, params) = replace_to_proxy_function(
                    &mut method.function,
                    &shadow_ident,
                    method.kind == MethodKind::Getter,
                );
                let is_async = method.function.is_async;
                (
                    ClassMember::Method(ClassMethod { ..method }),
                    Some(gen_shadow_member(
                        &shadow_ident,
                        method.is_static,
                        body,
                        params,
                        is_async,
                    )),
                )
            } else {
                (ClassMember::Method(method), None)
            }
        }
        ClassMember::PrivateMethod(mut method) => {
            let origin_ident = IdentName::new(method.key.name, DUMMY_SP);
            let private_ident = PropName::Ident(get_private_ident(&origin_ident, key));
            let shadow_ident = get_shadow_ident(&origin_ident, key, true);
            let (body, params) = replace_to_proxy_function(
                &mut method.function,
                &shadow_ident,
                method.kind == MethodKind::Getter,
            );
            let is_async = method.function.is_async;
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
                )),
            )
        }
        ClassMember::ClassProp(mut prop) => {
            if let Some(ref mut v) = prop.value {
                if let Some(func) = v.as_mut_arrow() {
                    let origin_ident = prop.key.as_ident().unwrap();
                    let shadow_ident = get_shadow_ident(origin_ident, key, false);
                    let (body, params) = replace_to_proxy_arrow(func, &shadow_ident);
                    let is_async = func.is_async;
                    if let BlockStmtOrExpr::BlockStmt(body) = *body {
                        return (
                            ClassMember::ClassProp(ClassProp { ..prop }),
                            Some(gen_shadow_member(
                                &shadow_ident,
                                prop.is_static,
                                Some(body),
                                params,
                                is_async,
                            )),
                        );
                    }
                }
            }
            (ClassMember::ClassProp(prop), None)
        }
        ClassMember::PrivateProp(mut prop) => {
            let origin_ident = IdentName::new(prop.key.name, DUMMY_SP);
            let private_ident = PropName::Ident(get_private_ident(&origin_ident, key));
            if let Some(ref mut v) = prop.value {
                if let Some(func) = v.as_mut_arrow() {
                    let shadow_ident = get_shadow_ident(&origin_ident, key, true);
                    let (body, params) = replace_to_proxy_arrow(func, &shadow_ident);
                    let is_async = func.is_async;
                    if let BlockStmtOrExpr::BlockStmt(body) = *body {
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
                            )),
                        );
                    }
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
                            "
                            [$prop_name, $field_type, $is_static]
                            " as Expr,
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
                "
                this._defined_fields_ = $arr_expr;
                " as Stmt,
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
            "
            (window._hmrRegisterClass ? _hmrRegisterClass($key) : Function.prototype)
            " as Expr,
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

    fn visit_mut_class(&mut self, node: &mut Class) {
        let class_name = self.get_class_name(node);

        if !class_name.is_empty() {
            self.class_stack.push(class_name.clone());
            node.visit_mut_children_with(self);
            self.class_stack.pop();

            if !class_name.starts_with(HASH_KEY_PREFIX) {
                self.has_element = true;
            }

            let mut props = vec![];
            let mut body = vec![];
            while let Some(item) = node.body.pop() {
                let (origin_member, append) = transform_fn(item, &class_name);

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
        }
    }

    fn visit_mut_module_items(&mut self, node: &mut Vec<ModuleItem>) {
        node.visit_mut_children_with(self);

        if self.has_element {
            node.push(quote!(
                "
                if (module.hot) {
                    module.hot.accept();
                }
                " as ModuleItem,
            ));
        }
    }
}

pub fn hmr_transform(filename: Option<String>) -> impl VisitMut {
    TransformVisitor {
        filename: filename.unwrap_or_default(),
        ..Default::default()
    }
}