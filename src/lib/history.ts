import { join } from './path';
import {
  readDirEntries,
  readTextFile,
  writeTextFile,
  createDirAll,
  removePath,
  type DirEntry,
} from './tauri';

export interface Snapshot {
  path: string;
  name: string;
  /** 修改时间（Unix 毫秒）。 */
  modified: number;
  size: number;
}

export function historyRoot(configDir: string): string {
  return join(configDir, 'history');
}

export function docHistoryDir(configDir: string, docKey: string): string {
  return join(historyRoot(configDir), docKey);
}

/** 保存一份快照并按 maxHistory 裁剪旧的。 */
export async function saveSnapshot(
  configDir: string,
  docKey: string,
  content: string,
  maxHistory: number,
): Promise<string> {
  const dir = docHistoryDir(configDir, docKey);
  await createDirAll(dir);
  const stamp = Date.now();
  const file = join(dir, `${stamp}.md`);
  await writeTextFile(file, content);
  await pruneSnapshots(configDir, docKey, maxHistory);
  return file;
}

/** 列出某文档的快照（按时间倒序）。 */
export async function listSnapshots(configDir: string, docKey: string): Promise<Snapshot[]> {
  const dir = docHistoryDir(configDir, docKey);
  let entries: DirEntry[] = [];
  try {
    entries = await readDirEntries(dir);
  } catch {
    return [];
  }
  return entries
    .filter((e) => !e.isDir && e.ext === 'md')
    .map((e) => ({ path: e.path, name: e.name, modified: e.modified, size: e.size }))
    .sort((a, b) => b.modified - a.modified);
}

export function readSnapshot(path: string): Promise<string> {
  return readTextFile(path);
}

export function deleteSnapshot(path: string): Promise<void> {
  return removePath(path);
}

/** 保留最新的 maxHistory 个快照。 */
async function pruneSnapshots(
  configDir: string,
  docKey: string,
  maxHistory: number,
): Promise<void> {
  const snaps = await listSnapshots(configDir, docKey);
  if (snaps.length <= maxHistory) return;
  const toRemove = snaps.slice(maxHistory);
  await Promise.all(toRemove.map((s) => removePath(s.path).catch(() => {})));
}

/** 格式化快照时间为可读字符串。 */
export function formatSnapshotTime(stamp: number): string {
  const d = new Date(stamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
