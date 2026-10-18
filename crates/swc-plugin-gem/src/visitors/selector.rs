use once_cell::sync::Lazy;
use regex::{Captures, Regex};
use swc_common::DUMMY_SP;
use swc_core::ecma::visit::{noop_visit_mut_type, VisitMut, VisitMutWith};
use swc_ecma_ast::{TaggedTpl, Tpl, TplElement};

static SELECTOR_REG: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r#"^&((?:[^\s,{\(\["']+|\([^()]*\)|\[[^\]]*\]|"[^"]*"|'[^']*')+)"#,
    )
    .unwrap()
});

/// 伪元素不能放在 `:is()` 中，只包裹伪元素前面的部分
fn split_pseudo_element(selector: &str) -> (&str, &str) {
    let bytes = selector.as_bytes();
    let mut depth = 0;
    let mut quote = None;
    for (i, &c) in bytes.iter().enumerate() {
        match (quote, c) {
            (Some(q), _) if c == q => quote = None,
            (Some(_), _) => {}
            (None, b'"' | b'\'') => quote = Some(c),
            (None, b'(' | b'[') => depth += 1,
            (None, b')' | b']') => depth -= 1,
            (None, b':') if depth == 0 && bytes.get(i + 1) == Some(&b':') => {
                return selector.split_at(i);
            }
            _ => {}
        }
    }
    (selector, "")
}

fn replace_selector(caps: &Captures) -> String {
    let (compound, pseudo_element) = split_pseudo_element(&caps[1]);
    if compound.is_empty() {
        return caps[0].to_string();
    }
    format!(":is(&{compound},:host({compound})){pseudo_element}")
}

/// 跨模版片段记录嵌套层级，只有表示宿主元素的 `&` 才需要转换，
/// 即顶层或者 `:host`/`:scope` 中的 `&`，at-rule 继承上一层
#[derive(Default)]
struct CssScanner {
    stack: Vec<bool>,
    prelude: String,
    quote: Option<char>,
}

impl CssScanner {
    fn is_host(&self) -> bool {
        self.stack.last().copied().unwrap_or(true)
    }

    fn trans(&mut self, text: &str) -> String {
        let mut out = String::with_capacity(text.len());
        let mut i = 0;
        while let Some(c) = text[i..].chars().next() {
            let mut len = c.len_utf8();
            match (self.quote, c) {
                (Some(q), _) if c == q => self.quote = None,
                (Some(_), _) => {}
                (None, '"' | '\'') => self.quote = Some(c),
                (None, '/') if text[i..].starts_with("/*") => {
                    len = text[i..].find("*/").map_or(text.len() - i, |e| e + 2);
                    out.push_str(&text[i..i + len]);
                    i += len;
                    continue;
                }
                (None, '{') => {
                    let prelude = self.prelude.trim();
                    let is_host = if prelude.starts_with('@') {
                        self.is_host()
                    } else {
                        matches!(prelude, ":host" | ":scope")
                    };
                    self.stack.push(is_host);
                    self.prelude.clear();
                }
                (None, '}') => {
                    self.stack.pop();
                    self.prelude.clear();
                }
                (None, ';') => self.prelude.clear(),
                (None, '&') if self.is_host() => {
                    if let Some(caps) = SELECTOR_REG.captures(&text[i..]) {
                        len = caps[0].len();
                        out.push_str(&replace_selector(&caps));
                        self.prelude.push_str(&caps[0]);
                        i += len;
                        continue;
                    }
                }
                _ => {}
            }
            let s = &text[i..i + len];
            out.push_str(s);
            if !matches!(c, '{' | '}' | ';') {
                self.prelude.push_str(s);
            }
            i += len;
        }
        out
    }
}

fn trans_css_tpl(tpl: &Tpl) -> Tpl {
    let mut scanner = CssScanner::default();
    Tpl {
        span: DUMMY_SP,
        exprs: tpl.exprs.clone(),
        quasis: tpl
            .quasis
            .iter()
            .map(|x| TplElement {
                span: DUMMY_SP,
                tail: x.tail,
                cooked: None,
                raw: scanner.trans(x.raw.as_str()).into(),
            })
            .collect(),
    }
}

#[derive(Default)]
struct TransformVisitor {}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_tagged_tpl(&mut self, node: &mut TaggedTpl) {
        node.visit_mut_children_with(self);

        if let Some(ident) = node.tag.as_ident() {
            let tag_fn = ident.sym.as_str();
            if tag_fn == "css" {
                *node.tpl = trans_css_tpl(&node.tpl);
            }
        }
    }
}

pub fn selector_transform() -> impl VisitMut {
    TransformVisitor::default()
}
