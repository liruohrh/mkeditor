import { $inputRule } from '@milkdown/utils';
import { InputRule } from '@milkdown/prose/inputrules';
import { linkSchema } from '@milkdown/preset-commonmark';

/**
 * 让 `[text](url)` 在输入 `)` 时即时渲染为链接 mark。
 *
 * milkdown commonmark 默认不提供 link 的 inline input rule（只支持粘贴/加载解析），
 * 这里补一个：匹配 `[text](url)` 或 `[text](url "title")`，把整段替换为纯文本并加 link mark。
 *
 * 与 Crepe 的 LinkTooltip 互不冲突——input rule 负责输入时渲染，
 * LinkTooltip 负责悬停预览/编辑已有链接。
 *
 * 排除图片语法 `![alt](url)`：在 callback 里检查 start 前一字符是否为 `!`。
 */
export const linkInputRule = $inputRule((ctx) => {
  const linkType = linkSchema.type(ctx);
  return new InputRule(
    /\[(?<text>[^\]]+)\]\((?<url>[^)\s]+)(?:\s+"(?<title>[^"]*)")?\)/,
    (state, match, start, end) => {
      console.log(state, match, start, end);
      const text = match.groups?.text;
      const url = match.groups?.url;
      if (!text || !url) return null;

      // 排除图片语法 ![alt](url)：检查匹配起点前一字符
      if (start > 0) {
        const before = state.doc.textBetween(start - 1, start, '', '');
        if (before === '!') return null;
      }

      const title = match.groups?.title ?? null;
      const linkMark = linkType.create({ href: url, title });

      // 删除 `[text](url)` 整段，插入纯文本并打上 link mark
      return state.tr
        .deleteRange(start, end)
        .insertText(text, start)
        .addMark(start, start + text.length, linkMark);
    },
  );
});

export default linkInputRule;
