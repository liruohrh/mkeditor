import { useRef, useState } from 'react';
import { FilesIcon, ListTreeIcon, HistoryIcon, SearchIcon } from 'lucide-react';

import {
  useEditorStore,
  DEFAULT_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  type SidebarPanel,
} from '@/store/editorStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import FileTreePanel from './sidebar/FileTreePanel';
import OutlinePanel from './sidebar/OutlinePanel';
import HistoryPanel from './sidebar/HistoryPanel';
import SearchPanel from './sidebar/SearchPanel';

const PANELS: { id: SidebarPanel; label: string; icon: typeof FilesIcon }[] = [
  { id: 'files', label: '文件树', icon: FilesIcon },
  { id: 'outline', label: '文档大纲', icon: ListTreeIcon },
  { id: 'history', label: '文件历史', icon: HistoryIcon },
  { id: 'search', label: '搜索', icon: SearchIcon },
];

export default function Sidebar() {
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const panel = useEditorStore((s) => s.sidebarPanel);
  const setPanel = useEditorStore((s) => s.setSidebarPanel);
  const sidebarWidth = useEditorStore((s) => s.sidebarWidth);
  const setSidebarWidth = useEditorStore((s) => s.setSidebarWidth);

  // 拖拽中标记：用于在右边框显示激活颜色
  const [isResizing, setIsResizing] = useState(false);
  // 用 ref 存放拖拽起始坐标与起始宽度，避免重渲染
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  if (!sidebarOpen) return null;

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = { startX: e.clientX, startWidth: sidebarWidth };
    setIsResizing(true);
    // 拖拽期间禁用文本选区与光标闪烁，保持 col-resize 光标
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      const delta = ev.clientX - ds.startX;
      const next = ds.startWidth + delta;
      setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, next)));
    };
    const onUp = () => {
      dragState.current = null;
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r bg-background"
      style={{ width: sidebarWidth }}
    >
      {/* 顶部水平切换按钮 */}
      <div className="flex shrink-0 items-center gap-0.5 border-b px-1 py-1">
        {PANELS.map((p) => {
          const Icon = p.icon;
          const active = panel === p.id;
          return (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={active ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className={cn('flex-1', active && 'bg-muted')}
                  aria-label={p.label}
                  onClick={() => setPanel(p.id)}
                >
                  <Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{p.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {panel === 'files' && <FileTreePanel />}
        {panel === 'outline' && <OutlinePanel />}
        {panel === 'history' && <HistoryPanel />}
        {panel === 'search' && <SearchPanel />}
      </div>

      {/* 右边框拖拽手柄：拖拽时显示激活颜色，双击恢复默认宽度 */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="拖拽调整侧边栏宽度"
        title="拖拽调整宽度，双击恢复默认"
        onMouseDown={onResizeStart}
        onDoubleClick={() => setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
        className={cn(
          'absolute top-0 right-0 bottom-0 z-30 w-1 -mr-px cursor-col-resize transition-colors',
          isResizing ? 'bg-primary' : 'bg-transparent hover:bg-primary/60',
        )}
      />
    </aside>
  );
}
