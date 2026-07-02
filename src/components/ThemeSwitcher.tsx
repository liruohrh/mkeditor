import { ChevronDownIcon, CheckIcon } from 'lucide-react';

import type { ThemeMeta, ThemeMode } from '../themes/themes';
import { DEFAULT_GROUP } from '../lib/userThemes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  themes: ThemeMeta[];
  value: string;
  /** 当前生效的主题模式（用于挑选对应 mode 的色板）。 */
  mode: ThemeMode;
  onChange: (id: string) => void;
}

/** 分组渲染顺序：Builtin 在前，用户具名组按字母序居中，默认组（无组名）在最后。 */
function orderedGroups(themes: ThemeMeta[]): Map<string, ThemeMeta[]> {
  const map = new Map<string, ThemeMeta[]>();
  for (const t of themes) {
    const g = t.group || DEFAULT_GROUP;
    const list = map.get(g);
    if (list) list.push(t);
    else map.set(g, [t]);
  }
  const ordered = new Map<string, ThemeMeta[]>();
  // Builtin 优先
  if (map.has('Builtin')) {
    ordered.set('Builtin', map.get('Builtin')!);
    map.delete('Builtin');
  }
  // 其余具名组按字母序（排除默认组）
  const named = Array.from(map.keys())
    .filter((k) => k !== DEFAULT_GROUP)
    .sort();
  for (const k of named) {
    ordered.set(k, map.get(k)!);
    map.delete(k);
  }
  // 默认组最后
  if (map.has(DEFAULT_GROUP)) {
    ordered.set(DEFAULT_GROUP, map.get(DEFAULT_GROUP)!);
  }
  return ordered;
}

export default function ThemeSwitcher({ themes, value, mode, onChange }: Props) {
  const current = themes.find((t) => t.id === value) ?? themes[0];
  const groups = orderedGroups(themes);
  const entries = Array.from(groups.entries());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-40 justify-between">
          <span className="flex items-center gap-2">
            <Swatch colors={current.swatch[mode]} />
            <span className="truncate">{current.name}</span>
          </span>
          <ChevronDownIcon className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 max-h-96 overflow-y-auto">
        {entries.map(([groupName, items], gi) => {
          const isDefault = groupName === DEFAULT_GROUP;
          return (
            <div key={groupName}>
              {gi > 0 && <DropdownMenuSeparator />}
              {!isDefault && (
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {groupName}
                </DropdownMenuLabel>
              )}
              <DropdownMenuGroup>
                {items.map((t) => {
                  const supported = t.modes;
                  const single = supported.length === 1 ? supported[0] : null;
                  const active = t.id === value;
                  return (
                    <DropdownMenuItem key={t.id} onSelect={() => onChange(t.id)} className="gap-2">
                      <Swatch colors={t.swatch[mode]} />
                      <span className="flex-1 truncate">{t.name}</span>
                      <span
                        className={cn('text-[10px] uppercase tracking-wide text-muted-foreground')}
                      >
                        {single === 'dark' ? '深' : single === 'light' ? '浅' : '深/浅'}
                      </span>
                      {active && <CheckIcon className="text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Swatch({ colors }: { colors: string[] }) {
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full border border-border/60"
      aria-hidden
    >
      {colors.map((c, i) => (
        <span key={i} className="size-3" style={{ background: c }} />
      ))}
    </span>
  );
}
