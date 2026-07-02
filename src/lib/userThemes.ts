import { listFilesRecursive, readTextFile, createDirAll, pathExists, type DirEntry } from './tauri';
import { basename, stripExt, toSafeKey } from './path';
import type { ThemeMeta, ThemeMode } from '../themes/themes';

/** 默认分组名（直接位于 themes/ 下的主题）。 */
export const DEFAULT_GROUP = '默认';

export interface UserThemeMeta extends ThemeMeta {
  isUser: true;
  path: string;
  css: string;
}

/** 扫描用户主题目录（themes/xxgroup/xxx.css）。 */
export async function loadUserThemes(themesDir: string): Promise<UserThemeMeta[]> {
  await createDirAll(themesDir);
  let entries: DirEntry[] = [];
  try {
    entries = await listFilesRecursive(themesDir);
  } catch {
    return [];
  }
  const filtered = entries.filter((e) => e.ext === 'css');

  const themes: UserThemeMeta[] = [];
  for (const entry of filtered) {
    let css = '';
    try {
      css = await readTextFile(entry.path);
    } catch {
      continue;
    }
    const rel = entry.path.slice(themesDir.length).replace(/^[\\/]+/, '');
    const group = rel.includes('\\') || rel.includes('/') ? rel.split(/[\\/]/)[0] : DEFAULT_GROUP;
    const name = stripExt(basename(entry.path));
    const parsed = parseThemeCss(css);
    const id = parsed.id || `user-${toSafeKey(name)}`;
    const modes: ThemeMode[] = parsed.modes.length > 0 ? parsed.modes : ['dark', 'light'];
    themes.push({
      id,
      name,
      group,
      modes,
      swatch: normalizeSwatch(parsed.swatch, modes),
      isUser: true,
      path: entry.path,
      css,
    });
  }
  return themes;
}

interface ParsedTheme {
  id?: string;
  modes: ThemeMode[];
  swatch: Partial<Record<ThemeMode, [string, string, string]>>;
}

function parseThemeCss(css: string): ParsedTheme {
  const result: ParsedTheme = { modes: [], swatch: {} };
  const blocks = css.split('}');
  for (const block of blocks) {
    const openIdx = block.lastIndexOf('{');
    if (openIdx < 0) continue;
    const selector = block.slice(0, openIdx);
    const body = block.slice(openIdx + 1);
    const themeMatch = selector.match(/data-theme\s*=\s*"([^"]+)"/);
    const modeMatch = selector.match(/data-mode\s*=\s*"([^"]+)"/);
    if (!themeMatch || !modeMatch) continue;
    const mode = modeMatch[1] as ThemeMode;
    if (!result.id) result.id = themeMatch[1];
    if (!result.modes.includes(mode)) result.modes.push(mode);
    const bg = extractVar(body, '--md-bg');
    const fg = extractVar(body, '--md-fg');
    const accent = extractVar(body, '--md-accent');
    if (bg && accent) result.swatch[mode] = [bg, accent, fg || accent];
  }
  return result;
}

function extractVar(body: string, name: string): string | undefined {
  const re = new RegExp(name.replace(/-/g, '\\-') + '\\s*:\\s*([^;]+)');
  const m = body.match(re);
  return m ? m[1].trim() : undefined;
}

function normalizeSwatch(
  swatch: Partial<Record<ThemeMode, [string, string, string]>>,
  modes: ThemeMode[],
): Record<ThemeMode, [string, string, string]> {
  const fallback: [string, string, string] = ['#888888', '#3b82f6', '#cccccc'];
  const out = {} as Record<ThemeMode, [string, string, string]>;
  for (const m of modes) out[m] = swatch[m] || fallback;
  return out;
}

/** 确保用户主题目录存在。 */
export async function ensureThemesDir(themesDir: string): Promise<void> {
  if (!(await pathExists(themesDir))) await createDirAll(themesDir);
}
