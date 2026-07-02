import { useCallback, useEffect, useState } from 'react';
import { RefreshCwIcon, HistoryIcon, TrashIcon, RotateCcwIcon } from 'lucide-react';

import { useEditorStore } from '@/store/editorStore';
import {
  listSnapshots,
  readSnapshot,
  deleteSnapshot,
  formatSnapshotTime,
  type Snapshot,
} from '@/lib/history';
import { toSafeKey } from '@/lib/path';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function docKeyOf(path: string | null, name: string): string {
  return toSafeKey(path ?? `mem-${name}`);
}

export default function HistoryPanel() {
  const doc = useEditorStore((s) => s.docs.find((d) => d.id === s.activeId) ?? null);
  const configDir = useEditorStore((s) => s.configDir);
  const historyEnabled = useEditorStore((s) => s.config.storage.history.enable);
  const openContentDoc = useEditorStore((s) => s.openContentDoc);
  const pushToast = useEditorStore((s) => s.pushToast);
  const openSettings = useEditorStore((s) => s.openSettings);

  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!configDir || !doc) {
      setSnaps([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listSnapshots(configDir, docKeyOf(doc.path, doc.name));
      setSnaps(list);
    } catch {
      setSnaps([]);
    } finally {
      setLoading(false);
    }
  }, [configDir, doc]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const restore = async (snap: Snapshot) => {
    try {
      const content = await readSnapshot(snap.path);
      const name = `${doc?.name ? doc.name.replace(/\.md$/i, '') : '文档'}@${formatSnapshotTime(snap.modified).replace(/[: ]/g, '-')}.md`;
      openContentDoc(name, content);
      pushToast('已恢复为新文档', 'success');
    } catch (e) {
      pushToast(`恢复失败：${String(e)}`, 'error');
    }
  };

  const remove = async (snap: Snapshot) => {
    try {
      await deleteSnapshot(snap.path);
      setSnaps((prev) => prev.filter((s) => s.path !== snap.path));
    } catch (e) {
      pushToast(`删除失败：${String(e)}`, 'error');
    }
  };

  if (!historyEnabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <HistoryIcon className="size-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">历史快照未启用</p>
        <Button variant="outline" size="sm" onClick={openSettings}>
          前往设置
        </Button>
      </div>
    );
  }

  if (!doc) {
    return <EmptyState text="无打开文档" />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1">
        <span className="truncate text-xs font-medium" title={doc.name}>
          {doc.name}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto"
          aria-label="刷新"
          onClick={() => void reload()}
        >
          <RefreshCwIcon className={loading ? 'animate-spin' : undefined} />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {snaps.length === 0 ? (
          <EmptyState text="暂无快照" />
        ) : (
          <ul className="space-y-0.5 p-1">
            {snaps.map((s) => (
              <li
                key={s.path}
                className={cn(
                  'group flex items-center gap-1 rounded-sm px-2 py-1 text-xs hover:bg-accent',
                )}
              >
                <RotateCcwIcon className="size-3 shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  className="flex-1 truncate text-left"
                  title={formatSnapshotTime(s.modified)}
                  onClick={() => void restore(s)}
                >
                  {formatSnapshotTime(s.modified)}
                </button>
                <span className="text-muted-foreground">
                  {Math.max(1, Math.round(s.size / 1024))}K
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100"
                  aria-label="删除快照"
                  onClick={() => void remove(s)}
                >
                  <TrashIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}
