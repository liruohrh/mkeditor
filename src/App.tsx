import { useEffect, useMemo, useState } from 'react';
import { RotateCcwIcon, MoonIcon, SunIcon, EyeIcon, Code2Icon } from 'lucide-react';

import './editor/editor.css';
import './themes/material-ocean.css';
import './themes/material-palenight.css';
import './themes/material-darker.css';
import './themes/material-deep-ocean.css';
import './themes/cursor-dark.css';
import './themes/factory-ocean-depths.css';
import './themes/factory-sunset-boulevard.css';
import './themes/factory-forest-canopy.css';
import './themes/factory-modern-minimalist.css';
import './themes/factory-golden-hour.css';
import './themes/factory-arctic-frost.css';
import './themes/factory-desert-rose.css';
import './themes/factory-tech-innovation.css';
import './themes/factory-botanical-garden.css';
import './themes/factory-midnight-galaxy.css';

import MilkdownEditor from './editor/MilkdownEditor';
import ThemeSwitcher from './components/ThemeSwitcher';
import { sampleContent } from './editor/sample';
import {
  themes,
  defaultThemeId,
  defaultThemeMode,
  resolveMode,
  type ThemeMode,
} from './themes/themes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
type EditorMode = 'live' | 'source';

const THEME_STORAGE_KEY = 'mdeditor.theme';
const THEME_MODE_STORAGE_KEY = 'mdeditor.themeMode';
const EDITOR_MODE_STORAGE_KEY = 'mdeditor.editorMode';

/** 读取初始主题，回退到 defaultThemeId。 */
function loadTheme(): string {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v && themes.some((t) => t.id === v)) return v;
  } catch {
    /* ignore */
  }
  return defaultThemeId;
}

/** 读取初始主题模式，回退到 defaultThemeMode。 */
function loadThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return defaultThemeMode;
}

/** 读取初始编辑模式，回退到 live。 */
function loadEditorMode(): EditorMode {
  try {
    const v = localStorage.getItem(EDITOR_MODE_STORAGE_KEY);
    if (v === 'live' || v === 'source') return v;
  } catch {
    /* ignore */
  }
  return 'live';
}

/** 词数统计：CJK 单字计 1 词，拉丁/数字连续串计 1 词。 */
function countWords(s: string): number {
  const cjk = (s.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const latin = (s.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) || []).length;
  return cjk + latin;
}

function App() {
  const [themeId, setThemeId] = useState<string>(loadTheme);
  const [themeMode, setThemeMode] = useState<ThemeMode>(loadThemeMode);
  const [editorMode, setEditorMode] = useState<EditorMode>(loadEditorMode);
  const [markdown, setMarkdown] = useState<string>(sampleContent);

  const currentTheme = themes.find((t) => t.id === themeId) ?? themes[0];
  // 实际生效的模式（处理 cursor-dark 等仅单模式的回退）。
  const effectiveMode = resolveMode(currentTheme, themeMode);
  // 用户请求的模式若不被当前主题支持，标记一下用于 UI 提示。
  const modeFallback = effectiveMode !== themeMode;

  // 主题 + 模式写入 <html>，让 CSS 变量作用域生效。
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.setAttribute('data-mode', effectiveMode);
  }, [themeId, effectiveMode]);

  // 持久化各状态。
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      /* ignore */
    }
  }, [themeId]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    } catch {
      /* ignore */
    }
  }, [themeMode]);

  useEffect(() => {
    try {
      localStorage.setItem(EDITOR_MODE_STORAGE_KEY, editorMode);
    } catch {
      /* ignore */
    }
  }, [editorMode]);

  const stats = useMemo(() => {
    const lines = markdown === '' ? 0 : markdown.split('\n').length;
    const words = countWords(markdown);
    const chars = markdown.length;
    return { lines, words, chars };
  }, [markdown]);

  const resetSample = () => setMarkdown(sampleContent);

  // 主题模式 tooltip 文案：若发生回退，附上说明。
  const themeModeTip = modeFallback
    ? `${themeMode === 'dark' ? '深色' : '浅色'}模式（当前主题不支持，已回退到${
        effectiveMode === 'dark' ? '深' : '浅'
      }色）`
    : `${themeMode === 'dark' ? '深色' : '浅色'}模式（点击切换到${
        themeMode === 'dark' ? '浅色' : '深色'
      }）`;

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col">
        {/* ===== 顶栏 ===== */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-muted/50 px-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            <span className="text-sm font-semibold">MD Editor</span>
            <span className="text-xs text-muted-foreground">Milkdown · Material</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher
              themes={themes}
              value={themeId}
              mode={effectiveMode}
              onChange={setThemeId}
            />

            <Button variant="outline" size="sm" onClick={resetSample}>
              <RotateCcwIcon data-icon="inline-start" />
              重置示例
            </Button>
          </div>
        </header>

        {/* ===== 编辑器主区 ===== */}
        <main className="min-h-0 flex-1 overflow-hidden">
          {editorMode === 'live' ? (
            // 切换模式时通过 key 重建 MilkdownEditor，确保载入最新 markdown。
            <MilkdownEditor key="live-editor" initialValue={markdown} onChange={setMarkdown} />
          ) : (
            <textarea
              className="source-editor h-full w-full resize-none border-0 bg-background p-12 font-mono text-sm leading-7 outline-none"
              style={{ caretColor: 'var(--md-caret)' }}
              value={markdown}
              onChange={(e) => setMarkdown(e.currentTarget.value)}
              spellCheck={false}
              placeholder="# 在这里输入 Markdown…"
            />
          )}
        </main>

        {/* ===== 状态栏：左侧模式切换按钮，右侧统计 ===== */}
        <footer className="flex h-10 shrink-0 items-center gap-2 border-t bg-muted/50 px-4 text-xs text-muted-foreground">
          {/* 主题模式（dark/light）单按钮切换 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="切换主题模式"
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              >
                {themeMode === 'dark' ? <MoonIcon /> : <SunIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{themeModeTip}</TooltipContent>
          </Tooltip>

          {/* 编辑模式（live/source）单按钮切换 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="切换编辑模式"
                onClick={() => setEditorMode(editorMode === 'live' ? 'source' : 'live')}
              >
                {editorMode === 'live' ? <EyeIcon /> : <Code2Icon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {editorMode === 'live'
                ? '实时渲染（点击切换到源码）'
                : '源码模式（点击切换到实时渲染）'}
            </TooltipContent>
          </Tooltip>

          {/* 右侧：统计 */}
          <div className="ml-auto flex items-center gap-4">
            <span>
              行 <span className="font-medium text-foreground">{stats.lines.toLocaleString()}</span>
            </span>
            <span>
              词 <span className="font-medium text-foreground">{stats.words.toLocaleString()}</span>
            </span>
            <span>
              字符{' '}
              <span className="font-medium text-foreground">{stats.chars.toLocaleString()}</span>
            </span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export default App;
