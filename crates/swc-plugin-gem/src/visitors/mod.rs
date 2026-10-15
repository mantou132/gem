pub mod hmr;
pub mod html_minify;
pub mod import;
pub mod memo;
pub mod path;
pub mod preload;
pub mod selector;
pub mod store_key;
pub mod style_minify;

use std::hash::{DefaultHasher, Hash, Hasher};

/// 文件名等字符串的哈希，用于生成稳定的 key
fn hash_string(s: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    hasher.finish()
}
