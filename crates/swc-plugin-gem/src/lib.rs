use serde::Deserialize;
use swc_common::pass::Optional;
use swc_core::ecma::visit::VisitMutWith;
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};
use swc_ecma_ast::Program;
use visitors::import::gen_dts;
pub use visitors::import::import_transform;
pub use visitors::memo::memo_transform;
pub use visitors::minify::minify_transform;

mod visitors;

#[derive(Deserialize, Debug, Clone, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
struct PluginConfig {
    #[serde(default)]
    pub style_minify: bool,
    #[serde(default)]
    pub auto_import: bool,
    #[serde(default)]
    pub auto_import_dts: bool,
    #[serde(default)]
    pub resolve_path: bool,
    #[serde(default)]
    pub esm_provider: String,
    #[serde(default)]
    pub hmr: bool,
}

#[plugin_transform]
pub fn process_transform(mut program: Program, data: TransformPluginProgramMetadata) -> Program {
    let plugin_config = &data
        .get_transform_plugin_config()
        .expect("failed to get plugin config for gem plugin");
    let config =
        serde_json::from_str::<PluginConfig>(plugin_config).expect("invalid config for gem plugin");

    if config.auto_import_dts {
        gen_dts();
    }

    program.visit_mut_with(&mut (
        Optional {
            enabled: true,
            visitor: memo_transform(),
        },
        Optional {
            enabled: config.auto_import,
            visitor: import_transform(),
        },
        Optional {
            enabled: config.style_minify,
            visitor: minify_transform(),
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
                auto_import: true,
                ..Default::default()
            }
        )
    }
}
