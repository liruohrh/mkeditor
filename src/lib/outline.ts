export interface Heading {
  level: number;
  text: string;
  /** 在原文中的行号（0-based）。 */
  line: number;
}

const ATX_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const SETEXT_RE = /^(-{3,}|={3,})\s*$/;

/**
 * 从 Markdown 文本解析标题大纲。
 * 支持 ATX（#）与 Setext（下划线 =/-）语法，跳过围栏代码块内的内容。
 */
export function parseOutline(markdown: string): Heading[] {
  const lines = markdown.split('\n');
  const out: Heading[] = [];
  let inFence = false;
  let fenceMarker = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      const marker = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    const atx = line.match(ATX_RE);
    if (atx) {
      out.push({ level: atx[1].length, text: atx[2].trim(), line: i });
      continue;
    }
    // Setext：上一行非空且为段落文本，当前行为 === 或 ---
    const setext = line.match(SETEXT_RE);
    if (setext && i > 0) {
      const prev = lines[i - 1];
      if (prev.trim() !== '' && !prev.match(ATX_RE) && !prev.match(SETEXT_RE)) {
        const level = setext[1][0] === '=' ? 1 : 2;
        // 避免重复添加（setext 标题文本来自上一行）
        out.push({ level, text: prev.trim(), line: i - 1 });
      }
    }
  }
  return out;
}
