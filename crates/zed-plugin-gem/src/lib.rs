use std::{
    collections::{HashMap, HashSet},
    env, fs,
};

use serde::Deserialize;
use zed_extension_api::{self as zed, serde_json, settings::LspSettings, Result};

const LS_PKG_NAME: &str = "vscode-gem-languageservice";
const LS_BIN_PATH: &str = "node_modules/vscode-gem-languageservice/dist/index.js";

const TS_LSP_ID: &str = "ts-gem-lsp";
const TS_LSP_PKG_NAME: &str = "ts-gem-lsp";
const TS_LSP_BIN_PATH: &str = "node_modules/ts-gem-lsp/dist/bin.js";

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
struct GemExtension {
    checked_packages: HashSet<&'static str>,
}

impl GemExtension {
    fn file_exists(path: &str) -> bool {
        fs::metadata(path).is_ok_and(|stat| stat.is_file())
    }

    fn npm_server_path(
        &mut self,
        language_server_id: &zed::LanguageServerId,
        pkg_name: &'static str,
        bin_path: &str,
    ) -> Result<String> {
        let server_exists = Self::file_exists(bin_path);
        if self.checked_packages.contains(pkg_name) && server_exists {
            return Ok(bin_path.to_string());
        }

        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::CheckingForUpdate,
        );
        let version = zed::npm_package_latest_version(pkg_name)?;

        if !server_exists
            || zed::npm_package_installed_version(pkg_name)?.as_ref() != Some(&version)
        {
            zed::set_language_server_installation_status(
                language_server_id,
                &zed::LanguageServerInstallationStatus::Downloading,
            );
            let result = zed::npm_install_package(pkg_name, &version);
            match result {
                Ok(()) => {
                    if !Self::file_exists(bin_path) {
                        Err(format!(
                            "installed package '{pkg_name}' did not contain expected path \
                             '{bin_path}'",
                        ))?;
                    }
                }
                Err(error) => {
                    if !Self::file_exists(bin_path) {
                        Err(error)?;
                    }
                }
            }
        }

        self.checked_packages.insert(pkg_name);
        Ok(bin_path.to_string())
    }

    fn node_command(server_path: &str, args: &[&str]) -> Result<zed::Command> {
        let server_path = env::current_dir().unwrap().join(server_path);
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: [
                // https://nodejs.org/docs/latest/api/modules.html#loading-ecmascript-modules-using-require
                "--experimental-require-module",
                &server_path.to_string_lossy(),
            ]
            .into_iter()
            .chain(args.iter().copied())
            .map(String::from)
            .collect(),
            env: Default::default(),
        })
    }

    /// TypeScript 7 不加载 tsserver 插件，使用代理 `tsc --lsp` 的 ts-gem-lsp 取代 vtsls + ts-gem-plugin
    /// 项目不是 TypeScript 7 时 ts-gem-lsp 不提供任何能力
    fn ts_lsp_command(
        &mut self,
        language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let binary = LspSettings::for_worktree(TS_LSP_ID, worktree)
            .ok()
            .and_then(|settings| settings.binary);
        if let Some(path) = binary.as_ref().and_then(|binary| binary.path.clone()) {
            return Ok(zed::Command {
                command: path,
                args: binary
                    .and_then(|binary| binary.arguments)
                    .unwrap_or_default(),
                env: Default::default(),
            });
        }

        let server_path =
            self.npm_server_path(language_server_id, TS_LSP_PKG_NAME, TS_LSP_BIN_PATH)?;
        Self::node_command(&server_path, &[])
    }

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

    fn language_server_command(
        &mut self,
        language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        if language_server_id.as_ref() == TS_LSP_ID {
            return self.ts_lsp_command(language_server_id, worktree);
        }
        let server_path = self.npm_server_path(language_server_id, LS_PKG_NAME, LS_BIN_PATH)?;
        Self::node_command(&server_path, &["--stdio"])
    }

    fn language_server_workspace_configuration(
        &mut self,
        server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        let settings = zed::settings::LspSettings::for_worktree(server_id.as_ref(), worktree)
            .ok()
            .and_then(|lsp_settings| lsp_settings.settings.clone())
            .unwrap_or_default();
        Ok(Some(settings))
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
