use serde::Deserialize;
use swc_common::pass::Optional;
use swc_core::{
    ecma::visit::VisitMutWith,
    plugin::{
        metadata::TransformPluginMetadataContextKind, plugin_transform,
        proxies::TransformPluginProgramMetadata,
    },
};
use swc_ecma_ast::Program;
pub use visitors::{
    hmr::hmr_transform,
    import::{import_transform, AutoImport, AutoImportContent, AutoImportDts, MemberOrMemberAs},
    memo::memo_transform,
    minify::minify_transform,
    path::path_transform,
    preload::preload_transform,
};

mod visitors;

#[derive(Deserialize, Debug, Clone, PartialEq, Default)]
#[serde(default, rename_all = "camelCase")]
struct PluginConfig {
    pub style_minify: bool,
    /// e.g: https://github.com/mantou132/gem/blob/main/crates/swc-plugin-gem/README.md#example
    pub auto_import: AutoImport,
    /// Generate .d.ts file, use src/auto-import.d.ts when true
    pub auto_import_dts: AutoImportDts,
    /// Use esm directly with import map
    pub resolve_path: bool,
    ///depend on URL loader & top await
    pub preload: bool,
    /// Under development, need add `@mantou/gem/helper/hmr` to entry
    pub hmr: bool,
    /// un-implement
    pub lazy_view: bool,
}

#[plugin_transform]
pub fn process_transform(mut program: Program, data: TransformPluginProgramMetadata) -> Program {
    let plugin_config = &data
        .get_transform_plugin_config()
        .expect("failed to get plugin config for gem plugin");
    let config =
        serde_json::from_str::<PluginConfig>(plugin_config).expect("invalid config for gem plugin");

    let filename = data.get_context(&TransformPluginMetadataContextKind::Filename);

    program.visit_mut_with(&mut (
        Optional {
            // 只支持原生装饰器或 `runPluginFirst`，不然被转译了，改写不了
            enabled: true,
            visitor: memo_transform(),
        },
        Optional {
            enabled: match config.auto_import {
                AutoImport::Gem(enabled) => enabled,
                AutoImport::CustomContent(_) => true,
            },
            visitor: import_transform(config.auto_import, config.auto_import_dts),
        },
        Optional {
            enabled: config.style_minify,
            visitor: minify_transform(),
        },
        Optional {
            enabled: config.resolve_path,
            visitor: path_transform(filename.clone()),
        },
        Optional {
            enabled: config.preload,
            visitor: preload_transform(),
        },
        Optional {
            enabled: config.hmr,
            visitor: hmr_transform(),
        },
    ));

    program
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_return_default_config() {
        let config = serde_json::from_str::<PluginConfig>(r#"{"autoImport": true}"#).unwrap();
        assert_eq!(
            config,
            PluginConfig {
                auto_import: AutoImport::Gem(true),
                ..Default::default()
            }
        )
    }
}
