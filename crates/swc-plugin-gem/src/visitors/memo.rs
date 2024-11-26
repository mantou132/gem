use swc_common::DUMMY_SP;
use swc_core::{
    atoms::Atom,
    ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith},
};
use swc_ecma_ast::{
    AssignExpr, AssignOp, AssignTarget, Callee, Class, ClassDecl, ClassExpr, ClassMember, Expr,
    MemberExpr, MemberProp, MethodKind, PrivateMethod, PrivateName, PrivateProp, ReturnStmt,
    SimpleAssignTarget, ThisExpr,
};

#[derive(Default)]
struct TransformVisitor {
    private_props: Vec<Atom>,
    current_index: usize,
}

impl TransformVisitor {
    fn current_method(&self) -> &Atom {
        self.private_props.get(self.current_index).unwrap()
    }

    fn start_visit_mut_class(&mut self) {
        self.private_props = Vec::new();
        self.current_index = 0;
    }

    fn visit_mut_class(&mut self, node: &mut Box<Class>) {
        for prop in self.private_props.iter() {
            node.body.push(ClassMember::PrivateProp(PrivateProp {
                key: PrivateName {
                    span: DUMMY_SP,
                    name: prop.as_str().into(),
                },
                ..Default::default()
            }));
        }
    }
}

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

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_class_decl(&mut self, node: &mut ClassDecl) {
        self.start_visit_mut_class();

        node.visit_mut_children_with(self);

        self.visit_mut_class(&mut node.class);
    }

    fn visit_mut_class_expr(&mut self, node: &mut ClassExpr) {
        self.start_visit_mut_class();

        node.visit_mut_children_with(self);

        self.visit_mut_class(&mut node.class);
    }

    fn visit_mut_private_method(&mut self, node: &mut PrivateMethod) {
        if is_memo_getter(node) {
            self.current_index = self.private_props.len();
            self.private_props.push(node.key.name.clone());

            node.visit_mut_children_with(self);

            node.key = PrivateName {
                span: DUMMY_SP,
                name: format!("_{}", node.key.name).into(),
            }
        }
    }

    fn visit_mut_return_stmt(&mut self, node: &mut ReturnStmt) {
        // why? 类表达式会直接走到这里来？
        if self.private_props.is_empty() {
            return;
        }
        node.arg = Some(Box::new(Expr::Assign(AssignExpr {
            span: DUMMY_SP,
            op: AssignOp::Assign,
            left: AssignTarget::Simple(SimpleAssignTarget::Member(MemberExpr {
                span: DUMMY_SP,
                obj: ThisExpr { span: DUMMY_SP }.into(),
                prop: MemberProp::PrivateName(PrivateName {
                    span: DUMMY_SP,
                    name: self.current_method().clone(),
                }),
            })),
            right: node.arg.clone().unwrap_or(Expr::undefined(DUMMY_SP)),
        })));
    }
}

pub fn memo_transform() -> impl VisitMut {
    TransformVisitor::default()
}
