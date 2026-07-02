import { useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { configSchema, type AppConfig, type GroupDef, type LeafDef } from '@/lib/config';
import { cn } from '@/lib/utils';
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
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** 不可变地写入嵌套路径。 */
function setValue<T>(cfg: T, path: string[], value: unknown): T {
  if (path.length === 0) return cfg;
  const [head, ...rest] = path;
  const next: Record<string, unknown> = { ...(cfg as Record<string, unknown>) };
  if (rest.length === 0) {
    next[head] = value;
  } else {
    next[head] = setValue(next[head] as Record<string, unknown>, rest, value);
  }
  return next as T;
}

function isVisible(leaf: LeafDef, parentValue: Record<string, unknown> | undefined): boolean {
  if (!leaf.visibleWhen) return true;
  if (!parentValue) return false;
  return parentValue[leaf.visibleWhen.key] === leaf.visibleWhen.equals;
}

interface LeafProps {
  leaf: LeafDef;
  path: string[];
  value: unknown;
  parentValue: Record<string, unknown> | undefined;
  onChange: (path: string[], value: unknown) => void;
}

function LeafRow({ leaf, path, value, parentValue, onChange }: LeafProps) {
  const enabled = isVisible(leaf, parentValue);
  const id = path.join('.');
  const fieldPath = [...path, leaf.key];
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2', !enabled && 'opacity-50')}>
      <div className="flex flex-col gap-1">
        <Label htmlFor={id} className="text-sm">
          {leaf.label}
        </Label>
        {leaf.description && (
          <span className="text-xs text-muted-foreground">{leaf.description}</span>
        )}
      </div>
      <div className={cn('w-56 shrink-0', !enabled && 'pointer-events-none')}>
        {leaf.type === 'boolean' ? (
          <Switch id={id} checked={Boolean(value)} onCheckedChange={(v) => onChange(fieldPath, v)} disabled={!enabled} />
        ) : leaf.type === 'number' ? (
          <Input
            id={id}
            type="number"
            value={Number(value ?? 0)}
            min={leaf.min}
            max={leaf.max}
            step={leaf.step ?? 1}
            disabled={!enabled}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange(fieldPath, Number.isFinite(n) ? n : 0);
            }}
          />
        ) : leaf.type === 'select' ? (
          <Select value={String(value ?? '')} onValueChange={(v) => onChange(fieldPath, v)} disabled={!enabled}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leaf.options?.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={id}
            type="text"
            value={String(value ?? '')}
            disabled={!enabled}
            onChange={(e) => onChange(fieldPath, e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

interface GroupProps {
  node: GroupDef;
  path: string[];
  cfg: AppConfig;
  onChange: (path: string[], value: unknown) => void;
}

function GroupSection({ node, path, cfg, onChange }: GroupProps) {
  const curPath = [...path, node.key];
  const curValue =
    (curPath.reduce<unknown>((acc, k) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[k];
      }
      return undefined;
    }, cfg) as Record<string, unknown> | undefined) ?? undefined;

  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold">{node.label}</h3>
      {node.description && <p className="text-xs text-muted-foreground">{node.description}</p>}
      <div className="divide-y divide-border">
        {node.children.map((child) =>
          child.kind === 'leaf' ? (
            <LeafRow
              key={child.key}
              leaf={child}
              path={curPath}
              value={curValue?.[child.key]}
              parentValue={curValue}
              onChange={onChange}
            />
          ) : (
            <div key={child.key} className="py-2">
              <GroupSection node={child} path={curPath} cfg={cfg} onChange={onChange} />
            </div>
          ),
        )}
      </div>
    </section>
  );
}

export default function SettingsDialog() {
  const open = useEditorStore((s) => s.settingsOpen);
  const close = useEditorStore((s) => s.closeSettings);
  const storeConfig = useEditorStore((s) => s.config);
  const setConfig = useEditorStore((s) => s.setConfig);

  // 本地状态保证 UI 即时响应；store 同步持久化
  const [localConfig, setLocalConfig] = useState<AppConfig>(storeConfig);

  // 仅在对话框打开时从 store 同步，避免编辑过程中被 store 更新回灌
  useEffect(() => {
    if (open) setLocalConfig(storeConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleChange = useCallback(
    (path: string[], value: unknown) => {
      setLocalConfig((prev) => {
        const next = setValue(prev, path, value);
        void setConfig(() => next);
        return next;
      });
    },
    [setConfig],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>调整编辑器行为。更改会自动写入 config.json。</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6 pr-3">
            {configSchema.children.map((child) =>
              child.kind === 'group' ? (
                <GroupSection
                  key={child.key}
                  node={child}
                  path={[]}
                  cfg={localConfig}
                  onChange={handleChange}
                />
              ) : null,
            )}
          </div>
        </div>
        <DialogFooter className="border-t p-4">
          <Button onClick={close}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
