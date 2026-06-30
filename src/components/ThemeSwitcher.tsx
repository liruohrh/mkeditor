import { ChevronDownIcon, CheckIcon } from 'lucide-react';

import type { ThemeMeta, ThemeMode } from '../themes/themes';
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

export default function ThemeSwitcher({ themes, value, mode, onChange }: Props) {
  const current = themes.find((t) => t.id === value) ?? themes[0];

  // 按 group 分组渲染。
  const groups = groupBy(themes, (t) => t.group);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-40 justify-between">
          <span className="flex items-center gap-2">
            <Swatch colors={current.swatch[mode]} />
            <span>{current.name}</span>
          </span>
          <ChevronDownIcon className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {Array.from(groups.entries()).map(([groupName, items], gi) => (
          <div key={groupName}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {groupName}
            </DropdownMenuLabel>
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
        ))}
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

function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const k = keyFn(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}
