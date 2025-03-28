use std::{collections::HashMap, env};

use serde::Deserialize;
use zed_extension_api::{self as zed, serde_json, Result};

const TS_PLUGIN_PACKAGE_NAME: &str = "ts-gem-plugin";

const MC_PKG_NAME: &str = "gem-context-server";
const MC_BIN_PATH: &str = "node_modules/.bin/gem-context-server";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PackageJson {
    #[serde(default)]
    dependencies: HashMap<String, String>,
    #[serde(default)]
    dev_dependencies: HashMap<String, String>,
}

#[derive(Default)]
struct GemExtension {}

impl GemExtension {
    fn install_ts_plugin_if_needed(&self) -> Result<()> {
        let installed_plugin_version = zed::npm_package_installed_version(TS_PLUGIN_PACKAGE_NAME)?;
        let latest_plugin_version = zed::npm_package_latest_version(TS_PLUGIN_PACKAGE_NAME)?;

        if installed_plugin_version.as_ref() != Some(&latest_plugin_version) {
            println!("installing {TS_PLUGIN_PACKAGE_NAME}@{latest_plugin_version}");
            zed::npm_install_package(TS_PLUGIN_PACKAGE_NAME, &latest_plugin_version)?;
        } else {
            println!("ts-plugin already installed");
        }
        Ok(())
    }

    fn get_ts_plugin_root_path(&self, worktree: &zed::Worktree) -> Result<Option<String>> {
        let package_json = worktree.read_text_file("package.json")?;
        let package_json: PackageJson = serde_json::from_str(&package_json)
            .map_err(|err| format!("failed to parse package.json: {err}"))?;

        let has_local_plugin = package_json
            .dev_dependencies
            .contains_key(TS_PLUGIN_PACKAGE_NAME)
            || package_json
                .dependencies
                .contains_key(TS_PLUGIN_PACKAGE_NAME);

        if has_local_plugin {
            println!("Using local installation of {TS_PLUGIN_PACKAGE_NAME}");
            return Ok(None);
        }

        self.install_ts_plugin_if_needed()?;

        println!("Using global installation of {TS_PLUGIN_PACKAGE_NAME}");
        Ok(Some(
            env::current_dir().unwrap().to_string_lossy().to_string(),
        ))
    }
}

impl zed::Extension for GemExtension {
    fn new() -> Self {
        Self::default()
    }

    fn context_server_command(
        &mut self,
        _context_server_id: &zed::ContextServerId,
        _project: &zed::Project,
    ) -> Result<zed::Command> {
        let version = zed::npm_package_latest_version(MC_PKG_NAME)?;
        if zed::npm_package_installed_version(MC_PKG_NAME)?.as_ref() != Some(&version) {
            zed::npm_install_package(MC_PKG_NAME, &version)?;
        }

        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![env::current_dir()
                .unwrap()
                .join(MC_BIN_PATH)
                .to_string_lossy()
                .to_string()],
            env: Default::default(),
        })
    }


    fn language_server_additional_initialization_options(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        target_language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        match target_language_server_id.as_ref() {
            "typescript-language-server" => Ok(Some(serde_json::json!({
                "plugins": [{
                    "name": "ts-gem-plugin",
                    "location": self.get_ts_plugin_root_path(worktree)?.unwrap_or_else(|| worktree.root_path()),
                }],
            }))),
            _ => Ok(None),
        }
    }

    fn language_server_additional_workspace_configuration(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        target_language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        match target_language_server_id.as_ref() {
            "vtsls" => Ok(Some(serde_json::json!({
                "vtsls": {
                    "tsserver": {
                        "globalPlugins": [{
                            "name": "ts-gem-plugin",
                            "location": self.get_ts_plugin_root_path(worktree)?.unwrap_or_else(|| worktree.root_path()),
                            "enableForWorkspaceTypeScriptVersions": true
                        }]
                    }
                },
            }))),
            _ => Ok(None),
        }
    }
}

zed::register_extension!(GemExtension);
