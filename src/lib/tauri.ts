import { invoke } from '@tauri-apps/api/core';

/** 目录条目（来自 Rust read_dir_entries / list_files_recursive）。 */
export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  /** 扩展名（小写、无点）。目录为空字符串。 */
  ext: string;
  /** 修改时间（Unix 毫秒）。 */
  modified: number;
  /** 字节大小。 */
  size: number;
}

export const pathExists = (path: string) => invoke<boolean>('path_exists', { path });
export const readTextFile = (path: string) => invoke<string>('read_text_file', { path });
export const writeTextFile = (path: string, content: string) =>
  invoke<void>('write_text_file', { path, content });
export const createDirAll = (path: string) => invoke<void>('create_dir_all', { path });
export const removePath = (path: string) => invoke<void>('remove_path', { path });
export const renamePath = (from: string, to: string) => invoke<void>('rename_path', { from, to });
export const readDirEntries = (path: string) => invoke<DirEntry[]>('read_dir_entries', { path });
export const listFilesRecursive = (path: string) =>
  invoke<DirEntry[]>('list_files_recursive', { path });
export const pickOpenFile = () => invoke<string | null>('pick_open_file');
export const pickOpenDirectory = () => invoke<string | null>('pick_open_directory');
export const pickSaveFile = (defaultName?: string) =>
  invoke<string | null>('pick_save_file', { defaultName });
export const appConfigDir = () => invoke<string>('app_config_dir');
export const revealInExplorer = (path: string) =>
  invoke<void>('reveal_in_explorer', { path });
