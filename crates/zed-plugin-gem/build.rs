use std::{
    env,
    fs::{self, File, OpenOptions},
    io::{self, Cursor, Write},
    time::Duration,
};

use flate2::read::GzDecoder;
use fs_more::directory::copy_directory;
use reqwest::blocking::Client;
use tar::Archive;
use tempfile::tempdir;
use tracing::error;

fn sync_typescript() -> anyhow::Result<()> {
    let dir = tempdir()?;
    let dir_path = dir.path();
    let tar_gz_path = dir_path.join("archive.tar.gz");
    let mut tar_gz = File::create(&tar_gz_path)?;
    let client = Client::builder()
        .timeout(Duration::from_secs(100))
        .build()?;
    let response = client
        .get("https://github.com/zed-industries/zed/tarball/main")
        .send()?;
    let bytes = &mut response.bytes()?;
    let mut cursor = Cursor::new(bytes);
    io::copy(&mut cursor, &mut tar_gz)?;

    // new file descriptor
    let tar_gz = File::open(&tar_gz_path)?;
    let gz = GzDecoder::new(tar_gz);
    let mut archive = Archive::new(gz);
    let dst = dir_path.join("dist");
    fs::create_dir(&dst)?;
    archive.unpack(&dst)?;
    let zed_dir = fs::read_dir(&dst)?.last().unwrap().unwrap().file_name();
    copy_directory(
        dst.join(zed_dir).join("crates/languages/src/typescript"),
        "languages/typescript",
        Default::default(),
    )?;
    Ok(())
}

fn set_languages() -> anyhow::Result<()> {
    if !fs::read_to_string("languages/typescript/injections.scm")
        .unwrap_or_default()
        .contains("Gem")
    {
        sync_typescript()?;

        let mut file = OpenOptions::new()
            .append(true)
            .open("languages/typescript/injections.scm")?;

        let append_content = fs::read_to_string("src/injections.scm")?;

        writeln!(file)?;
        writeln!(file, "{append_content}")?;
    }

    Ok(())
}

fn main() {
    let profile = env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());
    if set_languages().is_err() {
        if profile == "release" {
            panic!("set languages error");
        } else {
            error!("set languages error");
        }
    }
}
