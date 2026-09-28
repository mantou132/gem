use swc_common::DUMMY_SP;
use swc_core::{
    atoms::Atom,
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
};
use swc_ecma_ast::{
    ArrowExpr, AssignExpr, AssignOp, AssignTarget, BlockStmt, BlockStmtOrExpr, CallExpr, Callee,
    Class, ClassDecl, ClassMember, ClassProp, Decorator, Expr, ExprOrSpread, ExprStmt,
    Ident, MemberExpr, MemberProp, MethodKind, Pat, PrivateMethod, PrivateName, PrivateProp,
    PropName, SimpleAssignTarget, Stmt, ThisExpr,
};

fn this_private_member(name: Atom) -> MemberExpr {
    MemberExpr {
        span: DUMMY_SP,
        obj: ThisExpr { span: DUMMY_SP }.into(),
        prop: MemberProp::PrivateName(PrivateName {
            span: DUMMY_SP,
            name,
        }),
    }
}

#[derive(Default)]
struct TransformVisitor {
    current_class_name: Option<Ident>,
    class_static_dep_fn: Vec<ClassMember>,
}

impl TransformVisitor {
    fn is_memo_getter(&mut self, node: &mut PrivateMethod) -> bool {
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

    fn process_decorator(&mut self, decorators: &mut [Decorator]) {
        if self.current_class_name.is_none() {
            return;
        }

        let class_name = self.current_class_name.as_ref().unwrap();

        decorators.iter_mut().for_each(|x| {
            if let Some(call_expr) = x.expr.as_mut_call() {
                if let Callee::Expr(b) = &call_expr.callee {
                    if let Some(ident) = b.as_ident() {
                        let name = ident.sym.as_str();
                        if name != "memo" && name != "effect" {
                            return;
                        }
                    }
                }

                if call_expr.args.len() != 1 || !call_expr.args[0].expr.is_arrow() {
                    return;
                }

                let first_arg = *call_expr.args.drain(0..1).next().unwrap().expr;
                if let Expr::Arrow(arrow_expr) = first_arg {
                    let idx = self.class_static_dep_fn.len();
                    let prop = format!("_dep_fn_{idx}");
                    // 忽略了箭头函数的 `this` 绑定，模块中类成员装饰器参数中的 `this`
                    // 会指向模块 正常情况下都不会使用
                    // `this`，所以忽略也无所谓
                    self.class_static_dep_fn
                        .push(ClassMember::ClassProp(ClassProp {
                            is_static: true,
                            key: PropName::Ident(prop.clone().into()),
                            value: Some(Expr::Arrow(arrow_expr).into()),
                            ..Default::default()
                        }));

                    call_expr.args.push(ExprOrSpread {
                        spread: None,
                        expr: Expr::Arrow(ArrowExpr {
                            params: vec![Pat::Ident("i".into())],
                            body: BlockStmtOrExpr::Expr(Box::new(Expr::Call(CallExpr {
                                callee: Callee::Expr(
                                    Expr::Member(MemberExpr {
                                        span: DUMMY_SP,
                                        obj: Expr::Ident(class_name.clone()).into(),
                                        prop: MemberProp::Ident(prop.into()),
                                    })
                                    .into(),
                                ),
                                args: vec![ExprOrSpread {
                                    spread: None,
                                    expr: Expr::Ident("i".into()).into(),
                                }],
                                ..Default::default()
                            })))
                            .into(),
                            ..Default::default()
                        })
                        .into(),
                    });
                }
            }
        });
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    // `@memo get #x() {}` => `get #_x() {}` `@memo #__x = () => { this.#x = this.#_x; };` `#x;`
    // 使用字段而非私有方法：方法装饰器的初始化器在所有字段定义前执行，访问私有成员时品牌检查会失败
    // 插入到 getter 原位置，使 memo 按源码顺序执行
    fn visit_mut_class(&mut self, node: &mut Class) {
        let mut body = Vec::with_capacity(node.body.len());
        for member in node.body.drain(..) {
            let ClassMember::PrivateMethod(mut method) = member else {
                body.push(member);
                continue;
            };
            if !self.is_memo_getter(&mut method) {
                body.push(ClassMember::PrivateMethod(method));
                continue;
            }

            let name = method.key.name.clone();
            let getter_name: Atom = format!("_{name}").into();
            method.key.name = getter_name.clone();
            let decorators = method.function.decorators.drain(..).collect();
            body.push(ClassMember::PrivateMethod(method));

            body.push(ClassMember::PrivateProp(PrivateProp {
                key: PrivateName {
                    span: DUMMY_SP,
                    name: format!("_{getter_name}").into(),
                },
                decorators,
                value: Some(Box::new(Expr::Arrow(ArrowExpr {
                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                        stmts: vec![Stmt::Expr(ExprStmt {
                            span: DUMMY_SP,
                            expr: Box::new(Expr::Assign(AssignExpr {
                                span: DUMMY_SP,
                                op: AssignOp::Assign,
                                left: AssignTarget::Simple(SimpleAssignTarget::Member(
                                    this_private_member(name.clone()),
                                )),
                                right: Box::new(Expr::Member(this_private_member(getter_name))),
                            })),
                        })],
                        ..Default::default()
                    })),
                    ..Default::default()
                }))),
                ..Default::default()
            }));
            body.push(ClassMember::PrivateProp(PrivateProp {
                key: PrivateName {
                    span: DUMMY_SP,
                    name,
                },
                ..Default::default()
            }));
        }
        node.body = body;

        node.visit_mut_children_with(self);
    }

    // 修复 https://github.com/swc-project/swc/issues/9565
    // 1. 修改所有类成员的装饰器，将原装饰器函数参数转为静态方法存在
    //    `members_decorators` 中
    // 2. 将 `members_decorators` 中的静态方法插入到 class 中
    fn visit_mut_class_decl(&mut self, node: &mut ClassDecl) {
        self.current_class_name = Some(node.ident.clone());
        node.visit_mut_children_with(self);
        self.current_class_name = None;
        node.class.body.append(&mut self.class_static_dep_fn);
    }

    fn visit_mut_class_member(&mut self, node: &mut ClassMember) {
        node.visit_mut_children_with(self);

        match node {
            ClassMember::PrivateMethod(private_method) => {
                self.process_decorator(&mut private_method.function.decorators);
            }
            ClassMember::PrivateProp(private_prop) => {
                self.process_decorator(&mut private_prop.decorators);
            }
            ClassMember::Method(method) => {
                self.process_decorator(&mut method.function.decorators);
            }
            ClassMember::ClassProp(class_prop) => {
                self.process_decorator(&mut class_prop.decorators);
            }
            _ => {}
        }
    }
}

pub fn memo_transform() -> impl VisitMut {
    TransformVisitor::default()
}
