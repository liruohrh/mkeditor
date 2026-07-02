import { readTextFile, writeTextFile, createDirAll, pathExists } from './tauri';
import { join, extname, basename, stripExt } from './path';

/** 读取一个 Markdown 文件为文本。 */
export function readMarkdownFile(path: string): Promise<string> {
  return readTextFile(path);
}

/** 若路径没有 .md/.markdown 扩展名则追加 .md。 */
export function ensureMdExtension(path: string): string {
  const ext = extname(path);
  if (ext === 'md' || ext === 'markdown') return path;
  return `${path}.md`;
}

/** 写入 Markdown 文件（自动创建父目录）。 */
export async function writeMarkdownFile(path: string, content: string): Promise<void> {
  if (path) {
    // write_text_file 已会创建父目录
    await writeTextFile(path, content);
  }
}

// ===== 会话持久化（最近一次工作区状态） =====

export interface SessionState {
  openPaths: string[];
  activePath: string | null;
  fileTreeRoot: string | null;
  expandedDirs: string[];
}

export async function getSessionPath(configDir: string): Promise<string> {
  return join(configDir, 'session.json');
}

export async function loadSession(configDir: string): Promise<SessionState | null> {
  try {
    const path = await getSessionPath(configDir);
    if (!(await pathExists(path))) return null;
    const text = await readTextFile(path);
    const obj = JSON.parse(text);
    return {
      openPaths: Array.isArray(obj.openPaths)
        ? obj.openPaths.filter((s: unknown) => typeof s === 'string')
        : [],
      activePath: typeof obj.activePath === 'string' ? obj.activePath : null,
      fileTreeRoot: typeof obj.fileTreeRoot === 'string' ? obj.fileTreeRoot : null,
      expandedDirs: Array.isArray(obj.expandedDirs)
        ? obj.expandedDirs.filter((s: unknown) => typeof s === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

export async function saveSession(configDir: string, session: SessionState): Promise<void> {
  await createDirAll(configDir);
  const path = join(configDir, 'session.json');
  await writeTextFile(path, JSON.stringify(session, null, 2));
}

export { basename, stripExt };
