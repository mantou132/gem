use std::path::PathBuf;

use swc_core::ecma::transforms::testing::test_fixture;
use swc_ecma_parser::{Syntax, TsSyntax};
use swc_ecma_visit::visit_mut_pass;
use swc_plugin_gem::{import_transform, memo_transform, minify_transform, path_transform};
use testing::fixture;

fn get_syntax() -> Syntax {
    Syntax::Typescript(TsSyntax {
        decorators: true,
        ..TsSyntax::default()
    })
}

#[fixture("tests/fixture/auto-import/**/input.ts")]
fn fixture_auto_import(input: PathBuf) {
    let output = input.parent().unwrap().join("output.ts");

    test_fixture(
        get_syntax(),
        &|_| visit_mut_pass(import_transform()),
        &input,
        &output,
        Default::default(),
    );
}

#[fixture("tests/fixture/memo/input.ts")]
fn fixture_memo(input: PathBuf) {
    let output = input.parent().unwrap().join("output.ts");

    test_fixture(
        get_syntax(),
        &|_| visit_mut_pass(memo_transform()),
        &input,
        &output,
        Default::default(),
    );
}

#[fixture("tests/fixture/minify/input.ts")]
fn fixture_minify(input: PathBuf) {
    let output = input.parent().unwrap().join("output.ts");

    test_fixture(
        get_syntax(),
        &|_| visit_mut_pass(minify_transform()),
        &input,
        &output,
        Default::default(),
    );
}

#[fixture("tests/fixture/path/input.ts")]
fn fixture_path(input: PathBuf) {
    let output = input.parent().unwrap().join("output.ts");

    test_fixture(
        get_syntax(),
        &|_| visit_mut_pass(path_transform()),
        &input,
        &output,
        Default::default(),
    );
}
