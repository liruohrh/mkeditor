import { create } from 'zustand';
import {
  themes as builtinThemes,
  defaultThemeId,
  defaultThemeMode,
  resolveMode,
  type ThemeMeta,
  type ThemeMode,
} from '../themes/themes';
import { loadUserThemes, type UserThemeMeta, DEFAULT_GROUP } from '../lib/userThemes';
import {
  loadConfig,
  saveConfig,
  defaultConfig,
  validateConfig,
  getConfigDir,
  type AppConfig,
} from '../lib/config';
import {
  loadSession,
  saveSession,
  readMarkdownFile,
  writeMarkdownFile,
  ensureMdExtension,
  type SessionState,
} from '../lib/storage';
import { saveSnapshot } from '../lib/history';
import { toSafeKey, basename, dirname, join } from '../lib/path';
import {
  pickOpenFile,
  pickOpenDirectory,
  pickSaveFile,
  pathExists,
  createDirAll,
  removePath,
  renamePath,
  revealInExplorer,
  writeTextFile,
} from '../lib/tauri';
import { sampleContent } from '../editor/sample';

export type EditorMode = 'live' | 'source';
export type SidebarPanel = 'files' | 'outline' | 'history' | 'search';

export interface Doc {
  id: string;
  /** 绝对路径；null 表示内存中未保存的新文档。 */
  path: string | null;
  name: string;
  content: string;
  dirty: boolean;
  /** 上次保存到磁盘的内容。 */
  savedContent: string;
}

export type CloseAction = 'save' | 'discard' | 'cancel';
export interface PendingClose {
  docId: string;
}
export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error' | 'success';
}

interface EditorState {
  ready: boolean;
  configDir: string | null;
  config: AppConfig;
  themes: ThemeMeta[];
  userThemes: UserThemeMeta[];

  docs: Doc[];
  activeId: string | null;

  editorMode: EditorMode;
  themeId: string;
  themeMode: ThemeMode;

  sidebarOpen: boolean;
  sidebarPanel: SidebarPanel;
  fileTreeRoot: string | null;
  expandedDirs: string[];
  treeVersion: number;

  settingsOpen: boolean;
  pendingClose: PendingClose | null;
  toast: Toast | null;

  // ---- actions ----
  init: () => Promise<void>;
  setEditorMode: (m: EditorMode) => void;
  setThemeId: (id: string) => void;
  setThemeMode: (m: ThemeMode) => void;
  setSidebarPanel: (p: SidebarPanel) => void;
  toggleSidebar: () => void;
  setFileTreeRoot: (root: string | null) => void;
  toggleDir: (path: string) => void;
  bumpTreeVersion: () => void;
  createFileInTree: (parentDir: string, name: string) => Promise<void>;
  createDirInTree: (parentDir: string, name: string) => Promise<void>;
  deletePathInTree: (path: string) => Promise<void>;
  renamePathInTree: (oldPath: string, newPath: string) => Promise<void>;
  movePathInTree: (srcPath: string, targetDir: string) => Promise<void>;
  revealPath: (path: string) => Promise<void>;
  copyPath: (path: string) => void;
  setActive: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  newDoc: () => void;
  openFilePath: (path: string) => Promise<void>;
  openFilePicker: () => Promise<void>;
  openDirPicker: () => Promise<void>;
  saveDoc: (id: string) => Promise<boolean>;
  saveDocAs: (id: string) => Promise<boolean>;
  requestCloseDoc: (id: string) => void;
  resolveClose: (action: CloseAction) => Promise<void>;
  openContentDoc: (name: string, content: string) => void;
  setConfig: (updater: (draft: AppConfig) => AppConfig) => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  pushToast: (message: string, kind?: Toast['kind']) => void;
  clearToast: () => void;
}

const THEME_KEY = 'mdeditor.theme';
const THEME_MODE_KEY = 'mdeditor.themeMode';
const EDITOR_MODE_KEY = 'mdeditor.editorMode';

function loadLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function saveLS(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
}

let _toastId = 0;
let _autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let _historyTimer: ReturnType<typeof setInterval> | null = null;
let _sessionTimer: ReturnType<typeof setTimeout> | null = null;

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function docNameFromPath(path: string): string {
  return basename(path) || 'untitled.md';
}

function docKey(doc: Doc): string {
  return toSafeKey(doc.path ?? `mem-${doc.name}`);
}

/** 注入用户主题 CSS（聚合到一个 <style id="user-themes">）。 */
function injectUserThemesCss(userThemes: UserThemeMeta[]) {
  const id = 'user-themes';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  const css = userThemes.map((t) => t.css).join('\n');
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export const useEditorStore = create<EditorState>((set, get) => {
  /** 周期保存当前文档（若启用）。 */
  const tickAutoSave = async () => {
    const { config, docs, activeId } = get();
    if (!config.storage.autoSave.enable) return;
    const doc = docs.find((d) => d.id === activeId);
    if (!doc || !doc.dirty) return;
    if (doc.path) {
      try {
        await writeMarkdownFile(doc.path, doc.content);
        set((s) => ({
          docs: s.docs.map((d) =>
            d.id === doc.id ? { ...d, dirty: false, savedContent: d.content } : d,
          ),
        }));
      } catch (e) {
        get().pushToast(`自动保存失败：${String(e)}`, 'error');
      }
    }
  };

  /** 周期保存历史快照（若启用）。 */
  const tickHistory = async () => {
    const { config, configDir, docs, activeId } = get();
    if (!config.storage.history.enable || !configDir) return;
    const doc = docs.find((d) => d.id === activeId);
    if (!doc) return;
    try {
      await saveSnapshot(configDir, docKey(doc), doc.content, config.storage.history.maxHistory);
    } catch (e) {
      console.warn('[history] snapshot failed', e);
    }
  };

  const applyTimers = () => {
    const { config } = get();
    if (_autoSaveTimer) clearInterval(_autoSaveTimer);
    if (_historyTimer) clearInterval(_historyTimer);
    if (config.storage.autoSave.enable) {
      const sec = Math.max(config.storage.autoSave.interval, 5);
      _autoSaveTimer = setInterval(() => void tickAutoSave(), sec * 1000);
    }
    if (config.storage.history.enable) {
      const sec = Math.max(config.storage.history.interval, 30);
      _historyTimer = setInterval(() => void tickHistory(), sec * 1000);
    }
  };

  const persistSession = () => {
    if (_sessionTimer) clearTimeout(_sessionTimer);
    _sessionTimer = setTimeout(async () => {
      const { configDir, docs, activeId, fileTreeRoot, expandedDirs } = get();
      if (!configDir) return;
      const active = docs.find((d) => d.id === activeId) ?? null;
      const session: SessionState = {
        openPaths: docs.filter((d) => d.path).map((d) => d.path!) as string[],
        activePath: active?.path ?? null,
        fileTreeRoot,
        expandedDirs,
      };
      try {
        await saveSession(configDir, session);
      } catch {
        /* ignore */
      }
    }, 500);
  };

  const addRecentFile = (path: string) => {
    set((s) => {
      const recent = [path, ...s.config.recentFiles.filter((p) => p !== path)].slice(0, 20);
      return { config: { ...s.config, recentFiles: recent } };
    });
    void get().setConfig((c) => c);
  };
  const addRecentDir = (path: string) => {
    set((s) => {
      const recent = [path, ...s.config.recentDirs.filter((p) => p !== path)].slice(0, 20);
      return { config: { ...s.config, recentDirs: recent } };
    });
    void get().setConfig((c) => c);
  };

  return {
    ready: false,
    configDir: null,
    config: defaultConfig(),
    themes: builtinThemes,
    userThemes: [],

    docs: [],
    activeId: null,

    editorMode: loadLS(EDITOR_MODE_KEY) === 'source' ? 'source' : 'live',
    themeId: loadLS(THEME_KEY) ?? defaultThemeId,
    themeMode: loadLS(THEME_MODE_KEY) === 'light' ? 'light' : defaultThemeMode,

    sidebarOpen: true,
    sidebarPanel: 'files',
    fileTreeRoot: null,
    expandedDirs: [],
    treeVersion: 0,

    settingsOpen: false,
    pendingClose: null,
    toast: null,

    init: async () => {
      try {
        const configDir = await getConfigDir();
        const config = await loadConfig();
        set({ configDir, config });

        // 用户主题
        const themesDir = join(configDir, 'themes');
        try {
          await createDirAll(themesDir);
          const userThemes = await loadUserThemes(themesDir);
          injectUserThemesCss(userThemes);
          set({
            userThemes,
            themes: [...builtinThemes, ...userThemes],
          });
        } catch (e) {
          console.warn('[themes] load user themes failed', e);
        }

        // 恢复会话
        const session = await loadSession(configDir);
        if (session) {
          const docs: Doc[] = [];
          for (const p of session.openPaths) {
            if (!(await pathExists(p))) continue;
            try {
              const content = await readMarkdownFile(p);
              docs.push({
                id: newId(),
                path: p,
                name: docNameFromPath(p),
                content,
                dirty: false,
                savedContent: content,
              });
            } catch {
              /* skip unreadable */
            }
          }
          let activeId = docs.length ? docs[0].id : null;
          if (session.activePath) {
            const match = docs.find((d) => d.path === session.activePath);
            if (match) activeId = match.id;
          }
          set({
            docs,
            activeId,
            fileTreeRoot: session.fileTreeRoot,
            expandedDirs: session.expandedDirs,
          });
        }

        // 若没有任何文档，创建一个示例文档
        if (get().docs.length === 0) {
          const doc: Doc = {
            id: newId(),
            path: null,
            name: '未命名.md',
            content: sampleContent,
            dirty: false,
            savedContent: sampleContent,
          };
          set({ docs: [doc], activeId: doc.id });
        }

        set({ ready: true });
        applyTimers();
      } catch (e) {
        console.error('[init] failed', e);
        get().pushToast(`初始化失败：${String(e)}`, 'error');
        // 兜底：创建示例文档
        if (get().docs.length === 0) {
          const doc: Doc = {
            id: newId(),
            path: null,
            name: '未命名.md',
            content: sampleContent,
            dirty: false,
            savedContent: sampleContent,
          };
          set({ docs: [doc], activeId: doc.id, ready: true });
        }
      }
    },

    setEditorMode: (m) => {
      saveLS(EDITOR_MODE_KEY, m);
      set({ editorMode: m });
    },
    setThemeId: (id) => {
      saveLS(THEME_KEY, id);
      set({ themeId: id });
    },
    setThemeMode: (m) => {
      saveLS(THEME_MODE_KEY, m);
      set({ themeMode: m });
    },
    setSidebarPanel: (p) => set({ sidebarPanel: p, sidebarOpen: true }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setFileTreeRoot: (root) => {
      set({ fileTreeRoot: root, expandedDirs: root ? [root] : [] });
      persistSession();
    },
    toggleDir: (path) =>
      set((s) => ({
        expandedDirs: s.expandedDirs.includes(path)
          ? s.expandedDirs.filter((p) => p !== path)
          : [...s.expandedDirs, path],
      })),

    bumpTreeVersion: () => set((s) => ({ treeVersion: s.treeVersion + 1 })),

    createFileInTree: async (parentDir, name) => {
      try {
        const fullPath = join(parentDir, name);
        await writeTextFile(fullPath, '');
        get().bumpTreeVersion();
        get().pushToast(`已创建 ${name}`, 'success');
      } catch (e) {
        get().pushToast(`创建文件失败：${String(e)}`, 'error');
      }
    },

    createDirInTree: async (parentDir, name) => {
      try {
        const fullPath = join(parentDir, name);
        await createDirAll(fullPath);
        get().bumpTreeVersion();
        get().pushToast(`已创建 ${name}`, 'success');
      } catch (e) {
        get().pushToast(`创建目录失败：${String(e)}`, 'error');
      }
    },

    deletePathInTree: async (path) => {
      try {
        await removePath(path);
        const doc = get().docs.find((d) => d.path === path);
        if (doc) {
          set((s) => {
            const docs = s.docs.filter((d) => d.id !== doc.id);
            let activeId = s.activeId;
            if (s.activeId === doc.id) {
              activeId = docs[0]?.id ?? null;
            }
            return { docs, activeId };
          });
          persistSession();
        }
        get().bumpTreeVersion();
        get().pushToast('已删除', 'success');
      } catch (e) {
        get().pushToast(`删除失败：${String(e)}`, 'error');
      }
    },

    renamePathInTree: async (oldPath, newPath) => {
      if (oldPath === newPath) return;
      try {
        await renamePath(oldPath, newPath);
        // 更新引用该路径的文档
        const doc = get().docs.find((d) => d.path === oldPath);
        if (doc) {
          set((s) => ({
            docs: s.docs.map((d) =>
              d.path === oldPath ? { ...d, path: newPath, name: docNameFromPath(newPath) } : d,
            ),
          }));
          persistSession();
        }
        get().bumpTreeVersion();
        get().pushToast('已重命名', 'success');
      } catch (e) {
        get().pushToast(`重命名失败：${String(e)}`, 'error');
      }
    },

    movePathInTree: async (srcPath, targetDir) => {
      const name = basename(srcPath);
      const newPath = join(targetDir, name);
      if (srcPath === newPath) return;
      await get().renamePathInTree(srcPath, newPath);
    },

    revealPath: async (path) => {
      try {
        await revealInExplorer(path);
      } catch (e) {
        get().pushToast(`打开文件管理器失败：${String(e)}`, 'error');
      }
    },

    copyPath: (path) => {
      try {
        void navigator.clipboard.writeText(path);
        get().pushToast('路径已复制', 'success');
      } catch {
        get().pushToast('复制失败', 'error');
      }
    },

    setActive: (id) => {
      const { docs, activeId, config } = get();
      // 切换文档时若启用自动保存，保存旧文档
      if (config.storage.autoSave.enable) {
        const old = docs.find((d) => d.id === activeId);
        if (old && old.dirty && old.path) {
          void writeMarkdownFile(old.path, old.content)
            .then(() =>
              set((s) => ({
                docs: s.docs.map((d) =>
                  d.id === old.id ? { ...d, dirty: false, savedContent: d.content } : d,
                ),
              })),
            )
            .catch((e) => get().pushToast(`自动保存失败：${String(e)}`, 'error'));
        }
      }
      set({ activeId: id });
      persistSession();
    },

    updateContent: (id, content) =>
      set((s) => ({
        docs: s.docs.map((d) =>
          d.id === id ? { ...d, content, dirty: content !== d.savedContent } : d,
        ),
      })),

    newDoc: () => {
      const doc: Doc = {
        id: newId(),
        path: null,
        name: `未命名-${get().docs.length + 1}.md`,
        content: '',
        dirty: false,
        savedContent: '',
      };
      set((s) => ({ docs: [...s.docs, doc], activeId: doc.id }));
      persistSession();
    },

    openFilePath: async (path) => {
      const existing = get().docs.find((d) => d.path === path);
      if (existing) {
        get().setActive(existing.id);
        return;
      }
      try {
        const content = await readMarkdownFile(path);
        const doc: Doc = {
          id: newId(),
          path,
          name: docNameFromPath(path),
          content,
          dirty: false,
          savedContent: content,
        };
        set((s) => ({ docs: [...s.docs, doc], activeId: doc.id }));
        addRecentFile(path);
        // 若没有文件树根，设为该文件所在目录
        if (!get().fileTreeRoot) get().setFileTreeRoot(dirname(path));
        persistSession();
      } catch (e) {
        get().pushToast(`打开失败：${String(e)}`, 'error');
      }
    },

    openFilePicker: async () => {
      try {
        const path = await pickOpenFile();
        if (path) await get().openFilePath(path);
      } catch (e) {
        get().pushToast(`打开文件失败：${String(e)}`, 'error');
      }
    },

    openDirPicker: async () => {
      try {
        const path = await pickOpenDirectory();
        if (!path) return;
        get().setFileTreeRoot(path);
        addRecentDir(path);
        get().setSidebarPanel('files');
      } catch (e) {
        get().pushToast(`打开目录失败：${String(e)}`, 'error');
      }
    },

    saveDoc: async (id) => {
      const doc = get().docs.find((d) => d.id === id);
      if (!doc) return false;
      if (!doc.path) return get().saveDocAs(id);
      try {
        await writeMarkdownFile(doc.path, doc.content);
        set((s) => ({
          docs: s.docs.map((d) =>
            d.id === id ? { ...d, dirty: false, savedContent: d.content } : d,
          ),
        }));
        addRecentFile(doc.path);
        get().bumpTreeVersion();
        return true;
      } catch (e) {
        get().pushToast(`保存失败：${String(e)}`, 'error');
        return false;
      }
    },

    saveDocAs: async (id) => {
      const doc = get().docs.find((d) => d.id === id);
      if (!doc) return false;
      try {
        const suggested = ensureMdExtension(doc.name);
        const path = await pickSaveFile(suggested);
        if (!path) return false;
        const finalPath = ensureMdExtension(path);
        await writeMarkdownFile(finalPath, doc.content);
        set((s) => ({
          docs: s.docs.map((d) =>
            d.id === id
              ? {
                  ...d,
                  path: finalPath,
                  name: docNameFromPath(finalPath),
                  dirty: false,
                  savedContent: d.content,
                }
              : d,
          ),
        }));
        addRecentFile(finalPath);
        if (!get().fileTreeRoot) get().setFileTreeRoot(dirname(finalPath));
        // 确保父目录已展开，并刷新文件树以显示新文件
        const parent = dirname(finalPath);
        if (!get().expandedDirs.includes(parent)) {
          set((s) => ({ expandedDirs: [...s.expandedDirs, parent] }));
        }
        get().bumpTreeVersion();
        return true;
      } catch (e) {
        get().pushToast(`另存为失败：${String(e)}`, 'error');
        return false;
      }
    },

    requestCloseDoc: (id) => {
      const doc = get().docs.find((d) => d.id === id);
      if (!doc) return;
      if (!doc.dirty) {
        // 无未保存改动，直接关闭
        set((s) => {
          const idx = s.docs.findIndex((d) => d.id === id);
          const docs = s.docs.filter((d) => d.id !== id);
          let activeId = s.activeId;
          if (s.activeId === id) {
            activeId = docs[idx]?.id ?? docs[idx - 1]?.id ?? docs[0]?.id ?? null;
          }
          return { docs, activeId };
        });
        persistSession();
        return;
      }
      set({ pendingClose: { docId: id } });
    },

    resolveClose: async (action) => {
      const { pendingClose } = get();
      if (!pendingClose) return;
      const id = pendingClose.docId;
      if (action === 'cancel') {
        set({ pendingClose: null });
        return;
      }
      if (action === 'save') {
        const ok = await get().saveDoc(id);
        if (!ok) {
          // 保存失败或取消另存，保持打开
          return;
        }
      }
      // 执行关闭
      set((s) => {
        const idx = s.docs.findIndex((d) => d.id === id);
        const docs = s.docs.filter((d) => d.id !== id);
        let activeId = s.activeId;
        if (s.activeId === id) {
          activeId = docs[idx] ? docs[idx].id : (docs[idx - 1]?.id ?? docs[0]?.id ?? null);
        }
        return { docs, activeId, pendingClose: null };
      });
      persistSession();
    },

    openContentDoc: (name, content) => {
      const doc: Doc = {
        id: newId(),
        path: null,
        name,
        content,
        dirty: true,
        savedContent: '',
      };
      set((s) => ({ docs: [...s.docs, doc], activeId: doc.id }));
      persistSession();
    },

    setConfig: async (updater) => {
      const next = validateConfig(updater(get().config));
      set({ config: next });
      try {
        await saveConfig(next);
      } catch (e) {
        get().pushToast(`保存设置失败：${String(e)}`, 'error');
      }
      applyTimers();
    },

    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),

    pushToast: (message, kind = 'info') => {
      const id = ++_toastId;
      set({ toast: { id, message, kind } });
      setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, 3200);
    },
    clearToast: () => set({ toast: null }),
  };
});

// ===== 选择器 / 派生 =====

export function useActiveDoc(): Doc | null {
  return useEditorStore((s) => s.docs.find((d) => d.id === s.activeId) ?? null);
}

export function useEffectiveThemeMode(): ThemeMode {
  return useEditorStore((s) => {
    const t = s.themes.find((x) => x.id === s.themeId) ?? s.themes[0];
    return resolveMode(t, s.themeMode);
  });
}

export { resolveMode, DEFAULT_GROUP };
