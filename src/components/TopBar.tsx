import {
  FolderOpenIcon,
  FileIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  PanelLeftIcon,
  SaveIcon,
  ClockIcon,
} from 'lucide-react';

import { useEditorStore } from '@/store/editorStore';
import ThemeSwitcher from './ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { basename } from '@/lib/path';

export default function TopBar() {
  const {
    themes,
    themeId,
    themeMode,
    setThemeId,
    setThemeMode,
    openFilePath,
    openSettings,
    toggleSidebar,
    config,
    activeId,
    saveDoc,
  } = useEditorStore();

  const effectiveMode = (() => {
    const t = themes.find((x) => x.id === themeId) ?? themes[0];
    return t.modes.includes(themeMode) ? themeMode : t.modes[0];
  })();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-muted/50 px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="侧边栏" onClick={toggleSidebar}>
            <PanelLeftIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">侧边栏</TooltipContent>
      </Tooltip>
      {/* 文件菜单 */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="文件">
                <FileIcon />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">文件</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="min-w-56">
          {/* 最近打开 */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ClockIcon />
              <span>最近打开</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
              {config.recentFiles.length === 0 && config.recentDirs.length === 0 ? (
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  暂无记录
                </DropdownMenuLabel>
              ) : null}
              {config.recentFiles.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    文件
                  </DropdownMenuLabel>
                  {config.recentFiles.map((p) => (
                    <DropdownMenuItem
                      key={p}
                      className="max-w-80 truncate"
                      onSelect={() => void openFilePath(p)}
                      title={p}
                    >
                      <FileIcon />
                      <span className="truncate">{basename(p)}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {config.recentDirs.length > 0 && (
                <>
                  {config.recentFiles.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    目录
                  </DropdownMenuLabel>
                  {config.recentDirs.map((p) => (
                    <DropdownMenuItem
                      key={p}
                      className="max-w-80 truncate"
                      onSelect={() => useEditorStore.getState().setFileTreeRoot(p)}
                      title={p}
                    >
                      <FolderOpenIcon />
                      <span className="truncate">{basename(p)}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => activeId && void saveDoc(activeId)}
            disabled={!activeId}
          >
            <SaveIcon />
            <span>保存</span>
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+S</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher themes={themes} value={themeId} mode={effectiveMode} onChange={setThemeId} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="切换亮/暗模式"
              className={themeMode === 'dark' ? 'text-[#94A3B8]' : 'text-[#D97706]'}
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            >
              {themeMode === 'dark' ? (
                <MoonIcon strokeWidth={1.75} />
              ) : (
                <SunIcon strokeWidth={1.75} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {themeMode === 'dark' ? '深色模式（点击切到浅色）' : '浅色模式（点击切到深色）'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="设置" onClick={openSettings}>
              <SettingsIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">设置</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
