//! 支持 ts-plugin: https://github.com/zed-industries/zed/issues/22410
//! 执行 LSP 命令: https://github.com/zed-industries/zed/issues/13756
//! https://github.com/typescript-language-server/typescript-language-server/blob/master/docs/configuration.md#plugins-option
//! https://github.com/yioneko/vtsls?tab=readme-ov-file#commands
//! https://github.com/typescript-language-server/typescript-language-server?tab=readme-ov-file#configure-plugin

use std::{env, fs};

use zed::settings::LspSettings;
use zed_extension_api::{self as zed, Command, ContextServerId, LanguageServerId, Project, Result};

const LS_PKG_NAME: &str = "vscode-gem-languageservice";
const LS_BIN_PATH: &str = "node_modules/.bin/vscode-gem-languageservice";

const MC_PKG_NAME: &str = "gem-context-server";
const MC_BIN_PATH: &str = "node_modules/.bin/gem-context-server";

#[derive(Default)]
struct GemExtension {
    ls_server_find: bool,
}

impl GemExtension {
    fn ls_exists(&self) -> bool {
        fs::metadata(LS_BIN_PATH).is_ok_and(|stat| stat.is_file())
    }

    fn ls_path(&mut self, language_server_id: &LanguageServerId) -> Result<String> {
        let server_exists = self.ls_exists();
        if self.ls_server_find && server_exists {
            return Ok(LS_BIN_PATH.to_string());
        }

        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::CheckingForUpdate,
        );
        let version = zed::npm_package_latest_version(LS_PKG_NAME)?;

        if !server_exists
            || zed::npm_package_installed_version(LS_PKG_NAME)?.as_ref() != Some(&version)
        {
            zed::set_language_server_installation_status(
                language_server_id,
                &zed::LanguageServerInstallationStatus::Downloading,
            );
            let result = zed::npm_install_package(LS_PKG_NAME, &version);
            match result {
                Ok(()) => {
                    if !self.ls_exists() {
                        Err(format!(
                            "installed package '{LS_PKG_NAME}' did not contain expected path \
                             '{LS_BIN_PATH}'",
                        ))?;
                    }
                }
                Err(error) => {
                    if !self.ls_exists() {
                        Err(error)?;
                    }
                }
            }
        }

        self.ls_server_find = true;
        Ok(LS_BIN_PATH.to_string())
    }
}

impl zed::Extension for GemExtension {
    fn new() -> Self {
        Self::default()
    }

    fn context_server_command(
        &mut self,
        _context_server_id: &ContextServerId,
        _project: &Project,
    ) -> Result<Command> {
        let version = zed::npm_package_latest_version(MC_PKG_NAME)?;
        if zed::npm_package_installed_version(MC_PKG_NAME)?.as_ref() != Some(&version) {
            zed::npm_install_package(MC_PKG_NAME, &version)?;
        }

        Ok(Command {
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
        language_server_id: &LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let server_path = self.ls_path(language_server_id)?;
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![
                env::current_dir()
                    .unwrap()
                    .join(server_path)
                    .to_string_lossy()
                    .to_string(),
                "--stdio".to_string(),
            ],
            env: Default::default(),
        })
    }

    fn language_server_workspace_configuration(
        &mut self,
        server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<zed::serde_json::Value>> {
        let settings = LspSettings::for_worktree(server_id.as_ref(), worktree)
            .ok()
            .and_then(|lsp_settings| lsp_settings.settings.clone())
            .unwrap_or_default();
        Ok(Some(settings))
    }
}

zed::register_extension!(GemExtension);
