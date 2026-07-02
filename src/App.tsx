import { useEffect } from 'react';

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

import { useEditorStore, useEffectiveThemeMode } from '@/store/editorStore';
import { TooltipProvider } from '@/components/ui/tooltip';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import EditorArea from '@/components/EditorArea';
import StatusBar from '@/components/StatusBar';
import SettingsDialog from '@/components/SettingsDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';

function App() {
  const ready = useEditorStore((s) => s.ready);
  const init = useEditorStore((s) => s.init);
  const themeId = useEditorStore((s) => s.themeId);
  const effectiveMode = useEffectiveThemeMode();
  const activeId = useEditorStore((s) => s.activeId);
  const saveDoc = useEditorStore((s) => s.saveDoc);

  // 初始化（加载配置、用户主题、恢复会话）
  useEffect(() => {
    void init();
  }, [init]);

  // 主题 + 模式写入 <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.setAttribute('data-mode', effectiveMode);
  }, [themeId, effectiveMode]);

  // Ctrl/Cmd+S 保存当前文档
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeId) void saveDoc(activeId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, saveDoc]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        加载中…
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-hidden">
            <EditorArea />
          </main>
        </div>
        <StatusBar />
      </div>

      {/* 浮层 */}
      <SettingsDialog />
      <ConfirmDialog />
      <Toast />
    </TooltipProvider>
  );
}

export default App;
