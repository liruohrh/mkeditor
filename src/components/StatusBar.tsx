import { useMemo } from 'react';
import { EyeIcon, Code2Icon } from 'lucide-react';

import { useEditorStore, useActiveDoc } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** 词数统计：CJK 单字计 1 词，拉丁/数字连续串计 1 词。 */
function countWords(s: string): number {
  const cjk = (s.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const latin = (s.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) || []).length;
  return cjk + latin;
}

export default function StatusBar() {
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const doc = useActiveDoc();

  const stats = useMemo(() => {
    const content = doc?.content ?? '';
    return {
      lines: content === '' ? 0 : content.split('\n').length,
      words: countWords(content),
      chars: content.length,
    };
  }, [doc?.content]);

  return (
    <footer className="flex h-7 shrink-0 items-center gap-2 border-t bg-muted/50 px-3 text-xs text-muted-foreground">
      {/* 左：编辑模式切换（单按钮切换） */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="切换编辑模式"
              onClick={() => setEditorMode(editorMode === 'live' ? 'source' : 'live')}
            >
              {editorMode === 'live' ? <EyeIcon /> : <Code2Icon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {editorMode === 'live' ? '实时渲染（点击切到源码）' : '源码（点击切到渲染）'}
          </TooltipContent>
        </Tooltip>
        <span className="text-foreground">
          {editorMode === 'live' ? '渲染' : '源码'}
        </span>
      </div>

      {/* 右：统计 */}
      <div className="ml-auto flex items-center gap-4 tabular-nums">
        <span>
          行 <span className="font-medium text-foreground">{stats.lines.toLocaleString()}</span>
        </span>
        <span>
          词 <span className="font-medium text-foreground">{stats.words.toLocaleString()}</span>
        </span>
        <span>
          字符 <span className="font-medium text-foreground">{stats.chars.toLocaleString()}</span>
        </span>
      </div>
    </footer>
  );
}
