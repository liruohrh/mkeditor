import { useEffect } from 'react';
import { CheckCircle2Icon, InfoIcon, AlertCircleIcon, XIcon } from 'lucide-react';

import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ICONS = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  error: AlertCircleIcon,
} as const;

const KIND_CLASS = {
  info: 'border-border bg-background text-foreground',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  error: 'border-destructive/40 bg-destructive/10 text-destructive',
} as const;

/** 全局浮层通知。 */
export default function Toast() {
  const toast = useEditorStore((s) => s.toast);
  const clear = useEditorStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toast, clear]);

  if (!toast) return null;
  const Icon = ICONS[toast.kind];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-12 z-[60] flex justify-center px-4">
      <div
        role="status"
        className={cn(
          'pointer-events-auto flex max-w-md items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-md',
          KIND_CLASS[toast.kind],
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="min-w-0 break-words">{toast.message}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="关闭通知"
          onClick={clear}
          className="shrink-0"
        >
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
