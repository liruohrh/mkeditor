import { useEffect, useRef } from 'react';
import { Crepe } from '@milkdown/crepe';

import { linkInputRule } from '@/editor/linkInputRule';
import { parseOutline } from '@/lib/outline';

interface Props {
  /** 作为编辑器初始内容的 Markdown，仅在挂载时使用（非受控）。 */
  initialValue: string;
  /** Markdown 文档发生变化时回调。 */
  onChange: (markdown: string) => void;
}

/**
 * 基于 @milkdown/crepe 的 React 包装。
 * 采用非受控模式：挂载时用 initialValue 初始化，之后通过 listener 上报变更。
 * 切换到实时渲染模式时由父组件重新挂载本组件，从而载入最新内容。
 *
 * Crepe 内置了 LinkTooltip / Toolbar / BlockEdit / CodeMirror / Table / Latex
 * 等功能，链接可直接在编辑器内点击编辑，无需源码模式。
 * 主题通过 editor.css 中的 --crepe-* → --md-* 变量桥接自动适配。
 */
export default function MilkdownEditor({ initialValue, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // 保存最新 markdown，用于大纲跳转时将源码行号映射到标题索引
  const markdownRef = useRef(initialValue);

  useEffect(() => {
    const root = hostRef.current;
    if (!root) return;

    let destroyed = false;
    let crepe: Crepe | undefined;

    try {
      crepe = new Crepe({
        root,
        defaultValue: initialValue,
        featureConfigs: {
          placeholder: {
            text: '在此输入 Markdown…',
            mode: 'doc',
          },
        },
      });
      // 注册自定义 link input rule：让 [text](url) 输入时即时渲染为链接
      crepe.editor.use(linkInputRule);
    } catch (err) {
      console.error('[crepe] init failed', err);
      return;
    }

    // 注册 markdown 变更监听
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        markdownRef.current = markdown;
        onChangeRef.current(markdown);
      });
    });

    crepe
      .create()
      .then(() => {
        if (destroyed) {
          void crepe?.destroy();
        }
      })
      .catch((err) => console.error('[crepe] create failed', err));

    return () => {
      destroyed = true;
      void crepe?.destroy();
    };
    // 仅在挂载时初始化编辑器，后续 props 变化不应重建。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 大纲跳转：将源码行号映射到对应的标题 DOM 节点并滚动到可视区域。
  // 大纲解析顺序与编辑器 DOM 中 h1~h6 的渲染顺序一致，按索引取目标节点。
  useEffect(() => {
    const onGoto = (e: Event) => {
      const line = (e as CustomEvent<number>).detail as number;
      const root = hostRef.current;
      if (root == null) return;
      const idx = parseOutline(markdownRef.current).findIndex((h) => h.line === line);
      if (idx < 0) return;
      const headingEls = root.querySelectorAll<HTMLElement>(
        '.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6',
      );
      const target = headingEls[idx];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
      }
    };
    window.addEventListener('mdeditor:goto-line', onGoto);
    return () => window.removeEventListener('mdeditor:goto-line', onGoto);
  }, []);

  return <div className="milkdown-host" ref={hostRef} />;
}
