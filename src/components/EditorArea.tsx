import { useEffect, useRef } from 'react';
import { XIcon, FilePlusIcon } from 'lucide-react';

import { useEditorStore } from '@/store/editorStore';
import MilkdownEditor from '@/editor/MilkdownEditor';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function EditorArea() {
  const docs = useEditorStore((s) => s.docs);
  const activeId = useEditorStore((s) => s.activeId);
  const editorMode = useEditorStore((s) => s.editorMode);
  const setActive = useEditorStore((s) => s.setActive);
  const updateContent = useEditorStore((s) => s.updateContent);
  const requestCloseDoc = useEditorStore((s) => s.requestCloseDoc);
  const newDoc = useEditorStore((s) => s.newDoc);

  const activeDoc = docs.find((d) => d.id === activeId) ?? null;

  if (docs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <FilePlusIcon className="size-8" />
        <p className="text-sm">没有打开的文档</p>
        <Button variant="outline" size="sm" onClick={newDoc}>
          <FilePlusIcon />
          新建文档
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 文档标签栏 */}
      <div
        className="tabbar-scroll flex h-9 shrink-0 items-stretch overflow-x-auto border-b bg-muted/30"
        onWheel={(e) => {
          // 鼠标垂直滚轮 → 水平滚动标签栏，便于多标签切换
          const el = e.currentTarget;
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            el.scrollLeft += e.deltaY;
          }
        }}
      >
        {docs.map((d) => {
          const active = d.id === activeId;
          return (
            <div
              key={d.id}
              className={cn(
                'relative group flex shrink-0 cursor-pointer items-center gap-1.5 border-r px-3 text-xs',
                active
                  ? 'bg-background text-foreground font-medium'
                  : 'bg-transparent text-muted-foreground hover:bg-muted/50',
              )}
              onClick={() => setActive(d.id)}
            >
              {active && (
                <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
              )}
              {d.dirty ? (
                <span className="size-1.5 rounded-full bg-primary" aria-label="未保存" />
              ) : (
                <span className="size-1.5 rounded-full bg-transparent" />
              )}
              <span className="max-w-40 truncate">{d.name}</span>
              <button
                type="button"
                className="ml-1 rounded-sm p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100"
                aria-label="关闭"
                onClick={(e) => {
                  e.stopPropagation();
                  requestCloseDoc(d.id);
                }}
              >
                <XIcon className="size-3" />
              </button>
            </div>
          );
        })}
        <div className="flex shrink-0 items-center px-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="新建文档"
            onClick={newDoc}
          >
            <FilePlusIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* 编辑器主体 */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {activeDoc &&
          (editorMode === 'live' ? (
            <MilkdownEditor
              key={activeDoc.id}
              initialValue={activeDoc.content}
              onChange={(md) => updateContent(activeDoc.id, md)}
            />
          ) : (
            <SourceEditor
              key={activeDoc.id}
              value={activeDoc.content}
              onChange={(v) => updateContent(activeDoc.id, v)}
            />
          ))}
      </div>
    </div>
  );
}

function SourceEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onGoto = (e: Event) => {
      const line = (e as CustomEvent<number>).detail as number;
      const ta = ref.current;
      if (!ta) return;
      const lines = value.split('\n');
      let offset = 0;
      for (let i = 0; i < Math.min(line, lines.length); i++) offset += lines[i].length + 1;
      ta.focus();
      ta.setSelectionRange(offset, offset + (lines[line]?.length ?? 0));
      // 滚动到该行
      const lineHeight = 28; // leading-7 ≈ 28px
      ta.scrollTop = Math.max(0, line * lineHeight - ta.clientHeight / 2);
    };
    window.addEventListener('mdeditor:goto-line', onGoto);
    return () => window.removeEventListener('mdeditor:goto-line', onGoto);
  }, [value]);

  return (
    <textarea
      ref={ref}
      className="source-editor h-full w-full resize-none border-0 bg-background p-12 font-mono text-sm leading-7 outline-none"
      style={{ caretColor: 'var(--md-caret)' }}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      spellCheck={false}
      placeholder="# 在这里输入 Markdown…"
    />
  );
}
