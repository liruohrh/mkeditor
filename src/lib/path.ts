/**
 * 轻量路径工具（OS 无关）。
 * 路径来自 Rust，Windows 下为反斜杠；join 时尽量沿用既有分隔符风格。
 */

function detectSep(segs: string[]): '/' | '\\' {
  for (const s of segs) {
    if (s.includes('\\')) return '\\';
    if (s.includes('/')) return '/';
  }
  return '\\';
}

export function basename(p: string): string {
  if (!p) return '';
  const norm = p.replace(/\\/g, '/');
  const parts = norm.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

export function dirname(p: string): string {
  if (!p) return '';
  const norm = p.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  if (idx < 0) return '';
  const pre = p.slice(0, idx);
  // 保留原始分隔符风格
  return pre || (norm.startsWith('/') ? '/' : '');
}

export function extname(p: string): string {
  const b = basename(p);
  const idx = b.lastIndexOf('.');
  return idx <= 0 ? '' : b.slice(idx + 1).toLowerCase();
}

export function stripExt(p: string): string {
  const e = extname(p);
  return e ? p.slice(0, -(e.length + 1)) : p;
}

export function join(...segs: string[]): string {
  const sep = detectSep(segs);
  const cleaned = segs
    .map((s) => s.replace(/[\\/]+$/g, '').replace(/^([A-Za-z]:)?[\\/]+/, (m) => m))
    .filter((s, i) => s !== '' || i === 0);
  let result = cleaned.join(sep);
  // 规整重复分隔符，但保留盘符（C:\）
  result = result.replace(/([\\/]){2,}/g, '$1');
  return result;
}

/**
 * 将任意路径转换为可用作目录/文件名的安全 key（用于历史快照目录命名）。
 * 保留可读性，仅替换分隔符与非法字符。
 */
export function toSafeKey(p: string): string {
  return (
    p
      .replace(/[\\/]+/g, '__')
      .replace(/[^A-Za-z0-9_\-\.]/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120) || 'untitled'
  );
}
