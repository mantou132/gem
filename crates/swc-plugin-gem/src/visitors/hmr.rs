//! https://rspack.dev/api/runtime-api/hmr
//!
//! - 将私有字段转译成公开字段
//! - 为函数成员（方法、getter、setter、字段，包括静态的）添加影子方法
//! - 调用 HMR API

use std::{mem, vec};

use once_cell::sync::Lazy;
use regex::Regex;
use swc_common::DUMMY_SP;
use swc_core::{
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
    quote,
};
use swc_ecma_ast::{
    BlockStmt, BlockStmtOrExpr, Callee, Class, ClassMember, ClassMethod, ClassProp, Expr,
    ExprOrSpread, Function, Ident, IdentName, Lit, MemberExpr, MemberProp, ModuleItem, Param,
    PropName, ThisExpr,
};

static DASH_REG: Lazy<Regex> = Lazy::new(|| Regex::new(r"-").unwrap());

#[derive(Default)]
struct TransformVisitor {
    has_element: bool,
    tag_name_stack: Vec<String>,
}

impl TransformVisitor {
    fn get_current_tag_name(&self) -> &str {
        self.tag_name_stack.last().unwrap()
    }
}

fn get_tag_name(node: &mut Class) -> String {
    node.decorators
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
        })
        .unwrap_or_default()
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

fn gen_proxy_body(shadow_ident: &IdentName) -> BlockStmt {
    let this_expr = Expr::Member(MemberExpr {
        obj: Box::new(Expr::This(ThisExpr { span: DUMMY_SP })),
        prop: MemberProp::Ident(shadow_ident.clone()),
        ..Default::default()
    });
    BlockStmt {
        stmts: vec![quote!(
            "
            return $expr.bind(this)(...arguments);
            " as Stmt,
            expr: Expr = this_expr
        )],
        ..Default::default()
    }
}

fn transform_fn(node: ClassMember, key: &str) -> (ClassMember, Option<ClassMember>) {
    // TODO: 支持计算属性名
    match node {
        ClassMember::Method(mut method) => {
            if let Some(origin_ident) = method.key.as_ident() {
                let shadow_ident = get_shadow_ident(origin_ident, key, false);
                let body = mem::replace(
                    &mut method.function.body,
                    gen_proxy_body(&shadow_ident).into(),
                );
                let params = method.function.params.drain(..).collect();
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
            let body = mem::replace(
                &mut method.function.body,
                gen_proxy_body(&shadow_ident).into(),
            );
            let params = method.function.params.drain(..).collect();
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
                    let body = mem::replace(
                        &mut func.body,
                        Box::new(BlockStmtOrExpr::BlockStmt(gen_proxy_body(&shadow_ident))),
                    );
                    let params = func.params.drain(..).map(|x| x.into()).collect();
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
                    let body = mem::replace(
                        &mut func.body,
                        Box::new(BlockStmtOrExpr::BlockStmt(gen_proxy_body(&shadow_ident))),
                    );
                    let params = func.params.drain(..).map(|x| x.into()).collect();
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
        let tag_name = get_tag_name(node);

        if !tag_name.is_empty() {
            self.tag_name_stack.push(tag_name.clone());
            node.visit_mut_children_with(self);
            self.tag_name_stack.pop();

            self.has_element = true;

            let mut body = vec![];
            while let Some(item) = node.body.pop() {
                let (member, append) = transform_fn(item, &tag_name);
                body.push(member);

                if let Some(member) = append {
                    body.push(member);
                }
            }
            body.reverse();
            node.body = body;
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
        } else {
            node.push(quote!(
                "
                if (module.hot) {
                   module.hot.decline();
                }
                " as ModuleItem,
            ));
        }
    }
}

pub fn hmr_transform() -> impl VisitMut {
    TransformVisitor::default()
}
