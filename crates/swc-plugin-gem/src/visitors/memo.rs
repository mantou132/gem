use swc_common::DUMMY_SP;
use swc_core::{
    atoms::Atom,
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
};
use swc_ecma_ast::{
    AssignExpr, AssignOp, AssignTarget, BlockStmt, Callee, Class, ClassMember, Decorator, Expr,
    ExprStmt, Function, MemberExpr, MemberProp, MethodKind, PrivateMethod, PrivateName,
    PrivateProp, SimpleAssignTarget, Stmt, ThisExpr,
};

fn is_memo_getter(node: &mut PrivateMethod) -> bool {
    if node.kind != MethodKind::Getter {
        return false;
    }

    node.function.decorators.iter().any(|x| {
        if let Some(call_expr) = x.expr.as_call() {
            if let Callee::Expr(b) = &call_expr.callee {
                if let Some(ident) = b.as_ident() {
                    return ident.sym.as_str() == "memo";
                }
            }
        }
        false
    })
}

#[derive(Default)]
struct TransformVisitor {
    private_props: Vec<(Atom, Vec<Decorator>, String)>,
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_class(&mut self, node: &mut Class) {
        node.visit_mut_children_with(self);

        while let Some((prop, decorators, getter_name)) = self.private_props.pop() {
            node.body.push(ClassMember::PrivateMethod(PrivateMethod {
                span: DUMMY_SP,
                kind: MethodKind::Method,
                key: PrivateName {
                    span: DUMMY_SP,
                    name: format!("_{}", getter_name).into(),
                },
                function: Box::new(Function {
                    span: DUMMY_SP,
                    params: vec![],
                    decorators,
                    body: Some(BlockStmt {
                        span: DUMMY_SP,
                        stmts: vec![Stmt::Expr(ExprStmt {
                            span: DUMMY_SP,
                            expr: Box::new(Expr::Assign(AssignExpr {
                                span: DUMMY_SP,
                                op: AssignOp::Assign,
                                left: AssignTarget::Simple(SimpleAssignTarget::Member(
                                    MemberExpr {
                                        span: DUMMY_SP,
                                        obj: ThisExpr { span: DUMMY_SP }.into(),
                                        prop: MemberProp::PrivateName(PrivateName {
                                            span: DUMMY_SP,
                                            name: prop.clone(),
                                        }),
                                    },
                                )),
                                right: Box::new(Expr::Member(MemberExpr {
                                    span: DUMMY_SP,
                                    obj: ThisExpr { span: DUMMY_SP }.into(),
                                    prop: MemberProp::PrivateName(PrivateName {
                                        span: DUMMY_SP,
                                        name: getter_name.as_str().into(),
                                    }),
                                })),
                            })),
                        })],
                        ..Default::default()
                    }),
                    ..Default::default()
                }),
                ..Default::default()
            }));
            node.body.push(ClassMember::PrivateProp(PrivateProp {
                key: PrivateName {
                    span: DUMMY_SP,
                    name: prop.as_str().into(),
                },
                ..Default::default()
            }));
        }
    }

    fn visit_mut_private_method(&mut self, node: &mut PrivateMethod) {
        if is_memo_getter(node) {
            let name = node.key.name.clone();
            let getter_name = format!("_{}", name);

            node.key = PrivateName {
                span: DUMMY_SP,
                name: getter_name.clone().into(),
            };

            let decorators = node.function.decorators.drain(..).collect();

            self.private_props
                .push((name.clone(), decorators, getter_name));
        }
    }
}

pub fn memo_transform() -> impl VisitMut {
    TransformVisitor::default()
}
