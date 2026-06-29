import { useEffect, useRef, useState } from 'react';
import type { ThemeMeta, ThemeMode } from '../themes/themes';

interface Props {
  themes: ThemeMeta[];
  value: string;
  /** 当前生效的主题模式（用于挑选对应 mode 的色板）。 */
  mode: ThemeMode;
  onChange: (id: string) => void;
}

export default function ThemeSwitcher({ themes, value, mode, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = themes.find((t) => t.id === value) ?? themes[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="theme-switcher" ref={ref}>
      <button
        type="button"
        className="ts-button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Swatch colors={current.swatch[mode]} />
        <span className="ts-label">{current.name}</span>
        <span className="ts-caret" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul className="ts-menu" role="listbox">
          {themes.map((t, i) => {
            const supported = t.modes;
            const single = supported.length === 1 ? supported[0] : null;
            const prevGroup = i > 0 ? themes[i - 1].group : null;
            const showGroupHeader = t.group !== prevGroup;
            return (
              <li key={t.id} role="option" aria-selected={t.id === value}>
                {showGroupHeader && <div className="ts-group">{t.group}</div>}
                <button
                  type="button"
                  className={t.id === value ? 'active' : ''}
                  onClick={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                >
                  <Swatch colors={t.swatch[mode]} />
                  <span className="ts-label">{t.name}</span>
                  <span className={`ts-mode ${single ?? 'both'}`}>
                    {single === 'dark' ? '深' : single === 'light' ? '浅' : '深/浅'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Swatch({ colors }: { colors: string[] }) {
  return (
    <span className="ts-swatch" aria-hidden>
      {colors.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </span>
  );
}
