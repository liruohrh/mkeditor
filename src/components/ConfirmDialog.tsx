import { useEditorStore } from '@/store/editorStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** 关闭未保存文档时的确认弹窗。 */
export default function ConfirmDialog() {
  const pending = useEditorStore((s) => s.pendingClose);
  const docs = useEditorStore((s) => s.docs);
  const resolveClose = useEditorStore((s) => s.resolveClose);

  const doc = pending ? (docs.find((d) => d.id === pending.docId) ?? null) : null;
  const open = !!pending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resolveClose('cancel')}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>未保存的更改</DialogTitle>
          <DialogDescription>
            {doc
              ? `「${doc.name}」有未保存的更改。是否在关闭前保存？`
              : '当前文档有未保存的更改。是否在关闭前保存？'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => void resolveClose('cancel')}>
            取消
          </Button>
          <Button variant="ghost" onClick={() => void resolveClose('discard')}>
            不保存
          </Button>
          <Button onClick={() => void resolveClose('save')}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
