import { useEffect, useRef } from 'react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { listener, listenerCtx } from '@milkdown/plugin-listener';

interface Props {
  /** 作为编辑器初始内容的 Markdown，仅在挂载时使用（非受控）。 */
  initialValue: string;
  /** Markdown 文档发生变化时回调。 */
  onChange: (markdown: string) => void;
}

/**
 * 极简的 Milkdown + React 包装。
 * 采用非受控模式：挂载时用 initialValue 初始化，之后通过 listener 上报变更。
 * 切换到实时渲染模式时由父组件重新挂载本组件，从而载入最新内容。
 */
export default function MilkdownEditor({ initialValue, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const root = hostRef.current;
    if (!root) return;

    let destroyed = false;
    let editor: Editor | undefined;

    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValue);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          onChangeRef.current(markdown);
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .create()
      .then((e) => {
        if (destroyed) {
          void e.destroy();
        } else {
          editor = e;
        }
      })
      .catch((err) => console.error('[milkdown] create failed', err));

    return () => {
      destroyed = true;
      void editor?.destroy();
    };
    // 仅在挂载时初始化编辑器，后续 props 变化不应重建。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="milkdown-host" ref={hostRef} />;
}
