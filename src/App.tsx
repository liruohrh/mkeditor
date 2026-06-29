import { useEffect, useMemo, useState } from 'react';
import './App.css';
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="brand-dot" aria-hidden />
          <span className="brand-name">MD Editor</span>
          <span className="brand-sub">Milkdown · Material</span>
        </div>

        <div className="spacer" />

        {/* 主题模式（dark/light）切换 */}
        <div
          className="mode-toggle theme-mode-toggle"
          role="tablist"
          aria-label="主题模式"
          title={
            modeFallback
              ? `当前主题不支持 ${themeMode === 'dark' ? '深' : '浅'}色，已回退到 ${
                  effectiveMode === 'dark' ? '深' : '浅'
                }色`
              : ''
          }
        >
          <button
            type="button"
            role="tab"
            aria-selected={themeMode === 'dark'}
            className={themeMode === 'dark' ? 'active' : ''}
            onClick={() => setThemeMode('dark')}
          >
            深色
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={themeMode === 'light'}
            className={themeMode === 'light' ? 'active' : ''}
            onClick={() => setThemeMode('light')}
          >
            浅色
          </button>
        </div>

        {/* 编辑模式（实时渲染/源码）切换 */}
        <div className="mode-toggle" role="tablist" aria-label="编辑模式">
          <button
            type="button"
            role="tab"
            aria-selected={editorMode === 'live'}
            className={editorMode === 'live' ? 'active' : ''}
            onClick={() => setEditorMode('live')}
          >
            实时渲染
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={editorMode === 'source'}
            className={editorMode === 'source' ? 'active' : ''}
            onClick={() => setEditorMode('source')}
          >
            源码
          </button>
        </div>

        <ThemeSwitcher themes={themes} value={themeId} mode={effectiveMode} onChange={setThemeId} />

        <button type="button" className="ghost-btn" onClick={resetSample}>
          重置示例
        </button>
      </header>

      <main className={`app-main ${editorMode === 'live' ? 'live-mode' : 'source-mode'}`}>
        {editorMode === 'live' ? (
          // 切换模式时通过 key 重建 MilkdownEditor，确保载入最新 markdown。
          <MilkdownEditor key="live-editor" initialValue={markdown} onChange={setMarkdown} />
        ) : (
          <textarea
            className="source-editor"
            value={markdown}
            onChange={(e) => setMarkdown(e.currentTarget.value)}
            spellCheck={false}
            placeholder="# 在这里输入 Markdown…"
          />
        )}
      </main>

      <footer className="app-footer">
        <span className="stat">
          行 <span className="stat-value">{stats.lines.toLocaleString()}</span>
        </span>
        <span className="stat">
          词 <span className="stat-value">{stats.words.toLocaleString()}</span>
        </span>
        <span className="stat">
          字符 <span className="stat-value">{stats.chars.toLocaleString()}</span>
        </span>
        <span className="spacer" />
        <span className="mode-badge">
          {effectiveMode === 'dark' ? 'DARK' : 'LIGHT'}
          {modeFallback ? ' (fallback)' : ''}
        </span>
        <span className="mode-badge">{editorMode === 'live' ? 'WYSIWYG' : 'SOURCE'}</span>
      </footer>
    </div>
  );
}

export default App;
