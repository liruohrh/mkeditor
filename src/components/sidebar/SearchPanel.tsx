import { useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';

import { useEditorStore } from '@/store/editorStore';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Match {
  docId: string;
  docName: string;
  line: number;
  text: string;
  range: [number, number];
}

export default function SearchPanel() {
  const docs = useEditorStore((s) => s.docs);
  const setActive = useEditorStore((s) => s.setActive);
  const editorMode = useEditorStore((s) => s.editorMode);
  const [query, setQuery] = useState('');

  const matches = useMemo<Match[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    const out: Match[] = [];
    for (const d of docs) {
      const lines = d.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const idx = lines[i].toLowerCase().indexOf(lower);
        if (idx >= 0) {
          out.push({
            docId: d.id,
            docName: d.name,
            line: i,
            text: lines[i],
            range: [idx, idx + q.length],
          });
          if (out.length > 500) return out;
        }
      }
    }
    return out;
  }, [query, docs]);

  const openMatch = (m: Match) => {
    setActive(m.docId);
    if (editorMode === 'source') {
      // 等待切换后再滚动
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mdeditor:goto-line', { detail: m.line }));
      }, 50);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="在打开的文档中搜索…"
            className="h-8 pl-7 text-xs"
          />
        </div>
        {query.trim() && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {matches.length} 个结果 / {new Set(matches.map((m) => m.docId)).size} 个文档
          </p>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {matches.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <span className="text-xs text-muted-foreground">
              {query.trim() ? '无匹配结果' : '输入关键词搜索'}
            </span>
          </div>
        ) : (
          <ul className="space-y-1 p-1.5">
            {matches.map((m, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col gap-0.5 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent',
                  )}
                  onClick={() => openMatch(m)}
                >
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="truncate font-medium text-foreground">{m.docName}</span>
                    <span>: {m.line + 1}</span>
                  </span>
                  <span className="truncate font-mono text-[11px]">
                    {m.text.trim() || '(空行)'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
