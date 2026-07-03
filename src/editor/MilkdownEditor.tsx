import { useEffect, useRef } from 'react';
import { Crepe } from '@milkdown/crepe';

import { linkInputRule } from '@/editor/linkInputRule';

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

  return <div className="milkdown-host" ref={hostRef} />;
}
