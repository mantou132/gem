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
    hmr::{hmr_transform, HmrConfig, HmrTarget},
    html_minify::html_minify_transform,
    import::{import_transform, AutoImport, AutoImportContent, AutoImportDts, MemberOrMemberAs},
    memo::memo_transform,
    path::path_transform,
    preload::preload_transform,
    selector::selector_transform,
    ssr::{ssr_transform, SsrConfig, SsrTarget},
    style_minify::style_minify_transform,
};

mod visitors;

#[derive(Deserialize, Debug, Clone, PartialEq, Default)]
#[serde(default, rename_all = "camelCase")]
struct PluginConfig {
    /// Minify CSS in `css`/`styled` template literals
    pub style_minify: bool,
    /// Minify HTML in `html`/`svg`/`mathml` template literals
    pub html_minify: bool,
    /// e.g: https://github.com/mantou132/gem/blob/main/crates/swc-plugin-gem/README.md#example
    pub auto_import: AutoImport,
    /// Generate .d.ts file, use src/auto-import.d.ts when true
    pub auto_import_dts: AutoImportDts,
    /// Use esm directly with import map
    pub resolve_path: bool,
    /// Depend on URL loader & top await, only rewrite to `?url` in the server build
    pub preload: bool,
    /// Under development. `true` / `"webpack-hot"` emit `import.meta.webpackHot`;
    /// `unplugin-gem` injects `@mantou/gem/helper/hmr` and passes the matching target.
    /// Using this plugin directly still needs that helper on the entry.
    pub hmr: HmrConfig,
    /// Support `&:hover` in shadow dom and light dom
    pub selector_compatible: bool,
    /// SSR support: `"server"` / `"client"` build (`true` only adds keys, e.g. the build target is unknown),
    /// add key to module level `createStore` to sync store values to the client,
    /// rewrite `@server()` / `@lazy()` element classes in the client build,
    /// rewrite `@client()` element modules in the server build,
    /// `"lazy-chunk"` is set by `unplugin-gem` for the `?gem-lazy` module of the lazy view
    pub ssr: SsrConfig,
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
    let hmr_target = config.hmr.target();
    let ssr_target = config.ssr.target();

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
            visitor: import_transform(config.auto_import, config.auto_import_dts, filename.clone()),
        },
        Optional {
            enabled: config.selector_compatible,
            visitor: selector_transform(),
        },
        Optional {
            enabled: config.style_minify,
            visitor: style_minify_transform(),
        },
        Optional {
            enabled: config.html_minify,
            visitor: html_minify_transform(),
        },
        Optional {
            enabled: config.resolve_path,
            visitor: path_transform(filename.clone()),
        },
        Optional {
            enabled: config.preload,
            visitor: preload_transform(ssr_target == Some(SsrTarget::Server)),
        },
        Optional {
            // 先于 HMR，HMR 会把 `createStore` 包在函数中
            enabled: ssr_target.is_some(),
            visitor: ssr_transform(filename.clone(), ssr_target.unwrap_or(SsrTarget::Server)),
        },
        Optional {
            enabled: hmr_target.is_some(),
            visitor: hmr_transform(filename.clone(), hmr_target.unwrap_or_default()),
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

    #[test]
    fn should_parse_ssr_target() {
        let config = serde_json::from_str::<PluginConfig>(r#"{"ssr":"client"}"#).unwrap();
        assert_eq!(config.ssr.target(), Some(SsrTarget::Client));
        let config = serde_json::from_str::<PluginConfig>(r#"{"ssr":true}"#).unwrap();
        assert_eq!(config.ssr.target(), Some(SsrTarget::Unknown));
    }

    #[test]
    fn should_parse_hmr_target() {
        let config = serde_json::from_str::<PluginConfig>(r#"{"hmr":"import-meta-hot"}"#).unwrap();
        assert_eq!(config.hmr.target(), Some(HmrTarget::ImportMetaHot));
    }
}
