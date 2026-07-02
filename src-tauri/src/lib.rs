use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
    /// 文件扩展名（小写，无点）。目录为空字符串。
    ext: String,
    /// 修改时间（Unix 毫秒），失败为 0。
    modified: i64,
    /// 文件大小（字节），目录为 0。
    size: u64,
}

/// 解析应用配置目录（用户缓存目录/io.liruohrh.mdeditor），不存在则创建。
#[tauri::command]
fn app_config_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("resolve config dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("create config dir: {e}"))?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("read {path}: {e}"))
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create parent: {e}"))?;
    }
    fs::write(&path, content).map_err(|e| format!("write {path}: {e}"))
}

#[tauri::command]
fn create_dir_all(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("create dir {path}: {e}"))
}

#[tauri::command]
fn remove_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("remove dir {path}: {e}"))
    } else {
        fs::remove_file(p).map_err(|e| format!("remove file {path}: {e}"))
    }
}

#[tauri::command]
fn rename_path(from: String, to: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&to).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create parent: {e}"))?;
    }
    fs::rename(&from, &to).map_err(|e| format!("rename {from} -> {to}: {e}"))
}

#[tauri::command]
fn read_dir_entries(path: String) -> Result<Vec<DirEntry>, String> {
    let mut entries: Vec<DirEntry> = Vec::new();
    let read = match fs::read_dir(&path) {
        Ok(r) => r,
        Err(e) => return Err(format!("read dir {path}: {e}")),
    };
    for entry in read.flatten() {
        let file_type = entry.file_type();
        let is_dir = file_type.map(|t| t.is_dir()).unwrap_or(false);
        let name = entry.file_name().to_string_lossy().to_string();
        // 跳过隐藏文件/目录
        if name.starts_with('.') {
            continue;
        }
        let meta = entry.metadata().ok();
        let modified = meta
            .as_ref()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
        let ext = if is_dir {
            String::new()
        } else {
            Path::new(&name)
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default()
        };
        entries.push(DirEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir,
            ext,
            modified,
            size,
        });
    }
    // 目录优先，再按名称排序
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

/// 递归列出某目录下所有文件（用于用户主题扫描等场景）。
#[tauri::command]
fn list_files_recursive(path: String) -> Result<Vec<DirEntry>, String> {
    fn walk(dir: &Path, out: &mut Vec<DirEntry>) -> Result<(), String> {
        for entry in fs::read_dir(dir)
            .map_err(|e| format!("read dir: {e}"))?
            .flatten()
        {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            let file_type = entry.file_type().map_err(|e| e.to_string())?;
            let path_buf: PathBuf = entry.path();
            if file_type.is_dir() {
                walk(&path_buf, out)?;
            } else {
                let meta = entry.metadata().ok();
                let modified = meta
                    .as_ref()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                let ext = path_buf
                    .extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
                    .unwrap_or_default();
                out.push(DirEntry {
                    name,
                    path: path_buf.to_string_lossy().to_string(),
                    is_dir: false,
                    ext,
                    modified,
                    size,
                });
            }
        }
        Ok(())
    }
    let mut out = Vec::new();
    walk(Path::new(&path), &mut out)?;
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

/// 在系统文件管理器中显示某文件/目录。
#[tauri::command]
fn reveal_in_explorer(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if p.is_dir() {
            Command::new("explorer.exe")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("reveal: {e}"))?;
        } else {
            Command::new("explorer.exe")
                .arg(format!("/select,{}", path))
                .spawn()
                .map_err(|e| format!("reveal: {e}"))?;
        }
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        if p.is_dir() {
            Command::new("open").arg(&path).spawn().map_err(|e| format!("reveal: {e}"))?;
        } else {
            Command::new("open").args(["-R", &path]).spawn().map_err(|e| format!("reveal: {e}"))?;
        }
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        use std::process::Command;
        let dir = if p.is_dir() { &path } else { p.parent().map(|x| x.to_string_lossy().to_string()).unwrap_or_else(|| path.clone()).as_str() };
        Command::new("xdg-open").arg(dir).spawn().map_err(|e| format!("reveal: {e}"))?;
    }
    Ok(())
}

// ===== 原生文件对话框（rfd，在独立线程上阻塞运行） =====

#[tauri::command]
async fn pick_open_file() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .add_filter("Markdown", &["md", "markdown"])
            .pick_file()
    })
    .await
    .map_err(|e| e.to_string())
    .map(|opt| opt.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn pick_open_directory() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(|| rfd::FileDialog::new().pick_folder())
        .await
        .map_err(|e| e.to_string())
        .map(|opt| opt.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn pick_save_file(default_name: Option<String>) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut d = rfd::FileDialog::new().add_filter("Markdown", &["md", "markdown"]);
        if let Some(name) = default_name {
            d = d.set_file_name(name);
        }
        d.save_file().map(|p| p.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_config_dir,
            path_exists,
            read_text_file,
            write_text_file,
            create_dir_all,
            remove_path,
            rename_path,
            read_dir_entries,
            list_files_recursive,
            pick_open_file,
            pick_open_directory,
            pick_save_file,
            reveal_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
