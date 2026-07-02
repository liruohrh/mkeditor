import { useEffect, useState, useCallback, useRef, Ref, forwardRef } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderOpenIcon,
  RefreshCwIcon,
  FileIcon,
  FolderIcon,
  FilePlusIcon,
  FolderPlusIcon,
  Trash2Icon,
  CopyIcon,
  ExternalLinkIcon,
  PencilIcon,
} from 'lucide-react';

import { useEditorStore } from '@/store/editorStore';
import { readDirEntries, type DirEntry } from '@/lib/tauri';
import { basename, dirname, join } from '@/lib/path';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** 解析过滤字符串为扩展名集合（小写、无点）；空串 → null（显示全部）。 */
function parseFilter(filter: string): Set<string> | null {
  const trimmed = filter.trim();
  if (!trimmed) return null;
  const exts = trimmed
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((e) => (e.startsWith('.') ? e.slice(1) : e));
  return exts.length ? new Set(exts) : null;
}

type PendingAction =
  | { type: 'create'; parentDir: string; kind: 'file' | 'dir' }
  | { type: 'delete'; path: string; name: string; isDir: boolean }
  | null;

export default function FileTreePanel() {
  const root = useEditorStore((s) => s.fileTreeRoot);
  const openDirPicker = useEditorStore((s) => s.openDirPicker);
  const expanded = useEditorStore((s) => s.expandedDirs);
  const toggleDir = useEditorStore((s) => s.toggleDir);
  const openFilePath = useEditorStore((s) => s.openFilePath);
  const treeVersion = useEditorStore((s) => s.treeVersion);
  const filterRaw = useEditorStore((s) => s.config.fileTree.filter);
  const createFileInTree = useEditorStore((s) => s.createFileInTree);
  const createDirInTree = useEditorStore((s) => s.createDirInTree);
  const deletePathInTree = useEditorStore((s) => s.deletePathInTree);
  const renamePathInTree = useEditorStore((s) => s.renamePathInTree);
  const movePathInTree = useEditorStore((s) => s.movePathInTree);
  const revealPath = useEditorStore((s) => s.revealPath);
  const copyPath = useEditorStore((s) => s.copyPath);
  const activePath = useEditorStore((s) => {
    const d = s.docs.find((x) => x.id === s.activeId);
    return d?.path ?? null;
  });

  const [cache, setCache] = useState<Record<string, DirEntry[]>>({});
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [nameInput, setNameInput] = useState('');
  const [renaming, setRenaming] = useState<{ path: string; value: string } | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  /** 在缓存中查找条目信息。 */
  const findEntry = useCallback(
    (path: string): DirEntry | null => {
      for (const entries of Object.values(cache)) {
        const found = entries.find((e) => e.path === path);
        if (found) return found;
      }
      return null;
    },
    [cache],
  );

  const handleTreeKeyDown = (ev: React.KeyboardEvent) => {
    if (!selectedPath) return;
    // 正在重命名时不拦截
    if (renaming) return;
    const entry = findEntry(selectedPath);
    if (!entry) return;
    if (ev.key === 'F2') {
      ev.preventDefault();
      startRename(entry.path, entry.name);
    } else if (ev.key === 'Delete' || (isMac && ev.metaKey && ev.key === 'Backspace')) {
      ev.preventDefault();
      requestDelete(entry.path, entry.name, entry.isDir);
    }
  };

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  const filter = parseFilter(filterRaw);

  const loadDir = useCallback(async (path: string) => {
    try {
      const entries = await readDirEntries(path);
      setCache((prev) => ({ ...prev, [path]: entries }));
      return entries;
    } catch {
      setCache((prev) => ({ ...prev, [path]: [] }));
      return [];
    }
  }, []);

  useEffect(() => {
    if (!root) return;
    setLoading(true);
    void loadDir(root).finally(() => setLoading(false));
  }, [root, loadDir]);

  useEffect(() => {
    if (treeVersion === 0) return;
    const dirs = Object.keys(cache);
    for (const d of dirs) void loadDir(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeVersion]);

  const requestCreate = (parentDir: string, kind: 'file' | 'dir') => {
    setNameInput('');
    setPending({ type: 'create', parentDir, kind });
  };
  const requestDelete = (path: string, name: string, isDir: boolean) => {
    setPending({ type: 'delete', path, name, isDir });
  };
  const startRename = (path: string, name: string) => {
    setRenaming({ path, value: name });
  };
  const confirmRename = async () => {
    if (!renaming) return;
    const newName = renaming.value.trim();
    if (!newName) {
      setRenaming(null);
      return;
    }
    const newPath = join(dirname(renaming.path), newName);
    await renamePathInTree(renaming.path, newPath);
    setRenaming(null);
  };

  const handleMove = async (srcPath: string, targetDir: string) => {
    // 不能将目录移入自身或子目录
    if (
      srcPath === targetDir ||
      targetDir.startsWith(srcPath + '\\') ||
      targetDir.startsWith(srcPath + '/')
    ) {
      return;
    }
    await movePathInTree(srcPath, targetDir);
  };

  const confirmPending = async () => {
    if (!pending) return;
    if (pending.type === 'create') {
      const name = nameInput.trim();
      if (!name) return;
      if (pending.kind === 'file') await createFileInTree(pending.parentDir, name);
      else await createDirInTree(pending.parentDir, name);
    } else {
      await deletePathInTree(pending.path);
    }
    setPending(null);
  };

  if (!root) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <FolderOpenIcon className="size-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">尚未打开目录</p>
        <Button variant="outline" size="sm" onClick={() => void openDirPicker()}>
          <FolderOpenIcon />
          打开目录
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1">
        <span className="truncate text-xs font-medium" title={root}>
          {basename(root)}
        </span>
        <div className="ml-auto flex items-center">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="刷新"
            onClick={() => void loadDir(root)}
          >
            <RefreshCwIcon className={loading ? 'animate-spin' : undefined} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="切换目录"
            onClick={() => void openDirPicker()}
          >
            <FolderOpenIcon />
          </Button>
        </div>
      </div>
      <div
        ref={treeRef}
        className="tabbar-scroll min-h-0 flex-1 overflow-y-auto outline-none"
        tabIndex={0}
        onKeyDown={handleTreeKeyDown}
        onMouseDown={(e) => {
          // 不需要此处也可以捕获快捷键
          // 点击树区域时聚焦容器（输入框除外），使 F2/Delete 快捷键可用
          // if (!(e.target instanceof HTMLInputElement)) {
          //   treeRef.current?.focus();
          // }
        }}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="min-h-full p-1 text-sm">
              <TreeLevel
                dirPath={root}
                depth={0}
                cache={cache}
                expanded={expanded}
                activePath={activePath}
                selectedPath={selectedPath}
                filter={filter}
                renamingPath={renaming?.path ?? null}
                renamingValue={renaming?.value ?? ''}
                onRenameChange={(v) => setRenaming((r) => (r ? { ...r, value: v } : null))}
                onRenameConfirm={confirmRename}
                onRenameCancel={() => setRenaming(null)}
                onToggle={toggleDir}
                onOpenDir={(p) => void loadDir(p)}
                onOpenFile={(p) => void openFilePath(p)}
                onCreate={requestCreate}
                onDelete={requestDelete}
                onRename={startRename}
                onMove={handleMove}
                onCopy={copyPath}
                onReveal={(p) => void revealPath(p)}
                onSelect={handleSelect}
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => requestCreate(root, 'file')}>
              <FilePlusIcon />
              <span>新建文件</span>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => requestCreate(root, 'dir')}>
              <FolderPlusIcon />
              <span>新建目录</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => copyPath(root)}>
              <CopyIcon />
              <span>复制路径</span>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => void revealPath(root)}>
              <ExternalLinkIcon />
              <span>在文件管理器中打开</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* 创建 / 删除确认对话框 */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-sm">
          {pending?.type === 'create' && (
            <>
              <DialogHeader>
                <DialogTitle>{pending.kind === 'file' ? '新建文件' : '新建目录'}</DialogTitle>
                <DialogDescription>
                  在 {basename(pending.parentDir)} 中创建
                  {pending.kind === 'file' ? '文件' : '目录'}。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="create-name">名称</Label>
                <Input
                  id="create-name"
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void confirmPending();
                  }}
                  placeholder={pending.kind === 'file' ? 'note.md' : 'assets'}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)}>
                  取消
                </Button>
                <Button onClick={() => void confirmPending()} disabled={!nameInput.trim()}>
                  创建
                </Button>
              </DialogFooter>
            </>
          )}
          {pending?.type === 'delete' && (
            <>
              <DialogHeader>
                <DialogTitle>确认删除</DialogTitle>
                <DialogDescription>
                  确定要删除{pending.isDir ? '目录' : '文件'}「{pending.name}」吗？
                  {pending.isDir && ' 该操作会删除目录下所有内容，且不可恢复。'}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)}>
                  取消
                </Button>
                <Button variant="destructive" onClick={() => void confirmPending()}>
                  删除
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TreeLevelProps {
  dirPath: string;
  depth: number;
  cache: Record<string, DirEntry[]>;
  expanded: string[];
  activePath: string | null;
  selectedPath: string | null;
  filter: Set<string> | null;
  renamingPath: string | null;
  renamingValue: string;
  onRenameChange: (v: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
  onToggle: (p: string) => void;
  onOpenDir: (p: string) => void | Promise<void>;
  onOpenFile: (p: string) => void;
  onCreate: (parentDir: string, kind: 'file' | 'dir') => void;
  onDelete: (path: string, name: string, isDir: boolean) => void;
  onRename: (path: string, name: string) => void;
  onMove: (srcPath: string, targetDir: string) => void;
  onCopy: (path: string) => void;
  onReveal: (path: string) => void;
  onSelect: (path: string) => void;
}

/** 重命名输入框：挂载后自动聚焦并选中文字。 */
const RenameInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
  }
>(function RenameInput({ value, onChange, onConfirm, onCancel }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          onConfirm();
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => {
        onConfirm();
      }}
      onClick={(ev) => ev.stopPropagation()}
      onDragStart={(ev) => ev.preventDefault()}
      className="min-w-0 flex-1 rounded-sm border bg-background px-1 py-0 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
});

function TreeLevel({
  dirPath,
  depth,
  cache,
  expanded,
  activePath,
  selectedPath,
  filter,
  renamingPath,
  renamingValue,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  onToggle,
  onOpenDir,
  onOpenFile,
  onCreate,
  onDelete,
  onRename,
  onMove,
  onCopy,
  onReveal,
  onSelect,
}: TreeLevelProps) {
  const entries = cache[dirPath];
  const isOpen = expanded.includes(dirPath);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen && !cache[dirPath]) {
      void onOpenDir(dirPath);
    }
  }, [isOpen, dirPath, cache, onOpenDir]);

  if (!isOpen || !entries) return null;

  const visible = filter
    ? entries.filter((e) => e.isDir || filter.has(e.ext.toLowerCase()))
    : entries;

  return (
    <ul className="space-y-0.5">
      {visible.map((e) => {
        const isDir = e.isDir;
        const open = expanded.includes(e.path);
        const active = e.path === activePath;
        const isSelected = e.path === selectedPath;
        const isRenaming = renamingPath === e.path;
        const isDragOver = dragOverPath === e.path;
        return (
          <li key={e.path}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  draggable={!isRenaming}
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData('text/plain', e.path);
                    ev.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(ev) => {
                    // 仅在目录上允许 drop；不要在此处 setState（会频繁重渲染导致拖拽中断）
                    if (isDir) {
                      ev.preventDefault();
                      ev.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDragEnter={(ev) => {
                    if (isDir) {
                      ev.preventDefault();
                      if (dragOverPath !== e.path) setDragOverPath(e.path);
                    }
                  }}
                  onDragLeave={(ev) => {
                    // 仅当真正离开该元素（而非进入子元素）时才清除高亮
                    if (
                      dragOverPath === e.path &&
                      !ev.currentTarget.contains(ev.relatedTarget as Node | null)
                    ) {
                      setDragOverPath(null);
                    }
                  }}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    const src = ev.dataTransfer.getData('text/plain');
                    if (src && isDir) onMove(src, e.path);
                    setDragOverPath(null);
                  }}
                  className={cn(
                    'flex w-full items-center gap-1 rounded-sm px-1 py-1 text-left text-xs',
                    'cursor-pointer hover:bg-accent',
                    active && 'bg-accent text-accent-foreground',
                    !active && isSelected && 'bg-accent/40',
                    isDragOver && 'ring-2 ring-primary bg-accent/50',
                  )}
                  style={{ paddingLeft: depth * 12 + 4 }}
                  onClick={() => {
                    onSelect(e.path);
                    if (isDir) onToggle(e.path);
                    else onOpenFile(e.path);
                  }}
                >
                  {isDir ? (
                    <>
                      {open ? (
                        <ChevronDownIcon className="size-3.5 shrink-0" />
                      ) : (
                        <ChevronRightIcon className="size-3.5 shrink-0" />
                      )}
                      {open ? (
                        <FolderOpenIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </>
                  ) : (
                    <>
                      <span className="size-3.5 shrink-0" />
                      <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    </>
                  )}
                  {isRenaming ? (
                    <RenameInput
                      ref={renameInputRef}
                      value={renamingValue}
                      onChange={onRenameChange}
                      onConfirm={onRenameConfirm}
                      onCancel={onRenameCancel}
                    />
                  ) : (
                    <span className="truncate">{e.name}</span>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent
                onCloseAutoFocus={(event) => {
                  if (isRenaming && renameInputRef.current) {
                    // fix: 延迟到下一帧聚焦，绕过 Radix ContextMenu 关闭后将焦点恢复到 trigger 的行为
                    // debug原因：快捷键没事，但是菜单就无法自动聚焦
                    // 可以在 RenameInput里timeout处理，但是最好还是在此处处理，
                    //  因为ContextContent关闭后还有动画，动画结束才执行卸载，
                    //  所以RenameInput里timeout（要估计动画时间） 或者 在这里处理
                    event.preventDefault();
                    renameInputRef.current.focus();
                    if (renameInputRef.current.value) {
                      renameInputRef.current.setSelectionRange(
                        0,
                        renameInputRef.current.value.lastIndexOf('.'),
                      );
                    }
                  }
                }}
              >
                {isDir && (
                  <>
                    <ContextMenuItem onSelect={() => onCreate(e.path, 'file')}>
                      <FilePlusIcon />
                      <span>新建文件</span>
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => onCreate(e.path, 'dir')}>
                      <FolderPlusIcon />
                      <span>新建目录</span>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                <ContextMenuItem onSelect={() => onCopy(e.path)}>
                  <CopyIcon />
                  <span>复制路径</span>
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onReveal(e.path)}>
                  <ExternalLinkIcon />
                  <span>在文件管理器中打开</span>
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onRename(e.path, e.name)}>
                  <PencilIcon />
                  <span>重命名</span>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete(e.path, e.name, isDir)}
                >
                  <Trash2Icon />
                  <span>删除{isDir ? '目录' : '文件'}</span>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            {isDir && open && (
              <TreeLevel
                dirPath={e.path}
                depth={depth + 1}
                cache={cache}
                expanded={expanded}
                activePath={activePath}
                selectedPath={selectedPath}
                filter={filter}
                renamingPath={renamingPath}
                renamingValue={renamingValue}
                onRenameChange={onRenameChange}
                onRenameConfirm={onRenameConfirm}
                onRenameCancel={onRenameCancel}
                onToggle={onToggle}
                onOpenDir={onOpenDir}
                onOpenFile={onOpenFile}
                onCreate={onCreate}
                onDelete={onDelete}
                onRename={onRename}
                onMove={onMove}
                onCopy={onCopy}
                onReveal={onReveal}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
