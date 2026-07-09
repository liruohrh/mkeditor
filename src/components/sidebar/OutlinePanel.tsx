import { useMemo } from 'react';

import { useEditorStore } from '@/store/editorStore';
import { parseOutline } from '@/lib/outline';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function OutlinePanel() {
  const doc = useEditorStore((s) => s.docs.find((d) => d.id === s.activeId) ?? null);

  const headings = useMemo(() => (doc ? parseOutline(doc.content) : []), [doc]);

  const gotoLine = (line: number) => {
    // 源码模式：精确定位到行；实时渲染模式：滚动到对应标题
    window.dispatchEvent(new CustomEvent('mdeditor:goto-line', { detail: line }));
  };

  if (!doc) {
    return <EmptyState text="无打开文档" />;
  }

  if (headings.length === 0) {
    return <EmptyState text="未找到标题" />;
  }

  // 计算最小层级，便于相对缩进
  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <ScrollArea className="h-full">
      <ul className="space-y-0.5 p-2 text-sm">
        {headings.map((h, i) => (
          <li key={`${i}-${h.line}`}>
            <button
              type="button"
              className={cn(
                'flex w-full items-start gap-1.5 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent',
              )}
              style={{ paddingLeft: (h.level - minLevel) * 12 + 8 }}
              onClick={() => gotoLine(h.line)}
              title={`第 ${h.line + 1} 行`}
            >
              <span className="truncate">{h.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}
