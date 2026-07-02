import { FilesIcon, ListTreeIcon, HistoryIcon, SearchIcon } from 'lucide-react';

import { useEditorStore, type SidebarPanel } from '@/store/editorStore';
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

  if (!sidebarOpen) return null;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-background">
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
    </aside>
  );
}
