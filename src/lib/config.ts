import { appConfigDir, readTextFile, writeTextFile, createDirAll } from './tauri';
import { join } from './path';

/** 图片默认落点策略。 */
export type ImagePathMode = 'absolute' | 'doc-dir' | 'specified-dir' | 'doc-subdir';

export interface AutoSaveConfig {
  enable: boolean;
  interval: number;
}
export interface HistoryConfig {
  enable: boolean;
  interval: number;
  maxHistory: number;
}
export interface StorageConfig {
  autoSave: AutoSaveConfig;
  history: HistoryConfig;
}
export interface ImageConfig {
  defaultPath: ImagePathMode;
  specifiedDir: string;
  docSubdir: string;
}
export interface FileTreeConfig {
  /** 逗号分隔的扩展名（含点），仅显示这些类型的文件；目录始终显示。空字符串表示显示全部。 */
  filter: string;
}
export interface AppConfig {
  storage: StorageConfig;
  image: ImageConfig;
  fileTree: FileTreeConfig;
  /** 最近打开的文件（绝对路径）。 */
  recentFiles: string[];
  /** 最近打开的目录（绝对路径）。 */
  recentDirs: string[];
}

// ===== Schema 定义：驱动设置界面的渲染与校验 =====

export type FieldType = 'number' | 'boolean' | 'string' | 'select';

export interface LeafDef {
  kind: 'leaf';
  key: string;
  label: string;
  type: FieldType;
  default: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
  description?: string;
  /** 仅当同组内某叶子等于某值时显示。 */
  visibleWhen?: { key: string; equals: string | boolean | number };
}

export interface GroupDef {
  kind: 'group';
  key: string;
  label: string;
  description?: string;
  children: SchemaNode[];
}

export type SchemaNode = LeafDef | GroupDef;

export const configSchema: GroupDef = {
  kind: 'group',
  key: 'root',
  label: '设置',
  children: [
    {
      kind: 'group',
      key: 'storage',
      label: '存储',
      children: [
        {
          kind: 'group',
          key: 'autoSave',
          label: '自动保存',
          description: '定时保存当前文档；切换到其它文档时也会自动保存。',
          children: [
            { kind: 'leaf', key: 'enable', label: '启用', type: 'boolean', default: false },
            {
              kind: 'leaf',
              key: 'interval',
              label: '间隔（秒）',
              type: 'number',
              default: 5,
              min: 5,
              step: 1,
              visibleWhen: { key: 'enable', equals: true },
            },
          ],
        },
        {
          kind: 'group',
          key: 'history',
          label: '历史快照',
          description: '定时为当前文档保存历史快照，可在「文件历史」面板中恢复。',
          children: [
            { kind: 'leaf', key: 'enable', label: '启用', type: 'boolean', default: false },
            {
              kind: 'leaf',
              key: 'interval',
              label: '间隔（秒）',
              type: 'number',
              default: 30,
              min: 30,
              step: 1,
              visibleWhen: { key: 'enable', equals: true },
            },
            {
              kind: 'leaf',
              key: 'maxHistory',
              label: '最大快照数',
              type: 'number',
              default: 30,
              max: 30,
              step: 1,
              visibleWhen: { key: 'enable', equals: true },
            },
          ],
        },
      ],
    },
    {
      kind: 'group',
      key: 'image',
      label: '图片',
      description: '图片插入时的默认落点（图片上传暂不支持）。',
      children: [
        {
          kind: 'leaf',
          key: 'defaultPath',
          label: '默认位置',
          type: 'select',
          default: 'absolute',
          options: [
            { label: '绝对路径 / URL（默认）', value: 'absolute' },
            { label: '文档目录', value: 'doc-dir' },
            { label: '指定目录', value: 'specified-dir' },
            { label: '文档目录下的子目录', value: 'doc-subdir' },
          ],
        },
        {
          kind: 'leaf',
          key: 'specifiedDir',
          label: '指定目录',
          type: 'string',
          default: '',
          visibleWhen: { key: 'defaultPath', equals: 'specified-dir' },
        },
        {
          kind: 'leaf',
          key: 'docSubdir',
          label: '子目录名',
          type: 'string',
          default: '',
          visibleWhen: { key: 'defaultPath', equals: 'doc-subdir' },
        },
      ],
    },
    {
      kind: 'group',
      key: 'fileTree',
      label: '文件树',
      description: '控制文件树中显示哪些文件。',
      children: [
        {
          kind: 'leaf',
          key: 'filter',
          label: '文件过滤',
          type: 'string',
          default: '.md,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.mp4,.webm,.mov,.avi,.mkv',
          description: '逗号分隔的扩展名（含点），仅显示这些类型的文件；目录始终显示。留空显示全部。',
        },
      ],
    },
  ],
};

/** 默认配置（schema 推导 + recent 默认）。 */
export function defaultConfig(): AppConfig {
  // defaultsFromSchema 对根 group 也会包一层 { root: {...} }，这里解包。
  const fromSchema = defaultsFromSchema(configSchema) as {
    root: Partial<AppConfig>;
  };
  const root = fromSchema.root ?? {};
  return {
    storage: root.storage!,
    image: root.image!,
    fileTree: root.fileTree!,
    recentFiles: [],
    recentDirs: [],
  };
}

function defaultsFromSchema(node: SchemaNode): Record<string, unknown> {
  if (node.kind === 'leaf') return { [node.key]: node.default };
  const out: Record<string, unknown> = {};
  for (const child of node.children) {
    Object.assign(out, defaultsFromSchema(child));
  }
  return { [node.key]: out };
}

/** 根据 schema 校验并修正一个候选配置（深合并默认值、强制类型与范围）。 */
export function validateConfig(raw: unknown): AppConfig {
  const base = defaultConfig();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const out: AppConfig = base;

  // storage
  const storage = (r.storage ?? {}) as Record<string, unknown>;
  out.storage.autoSave = clampGroup(
    storage.autoSave,
    base.storage.autoSave as unknown as Record<string, unknown>,
  ) as unknown as AutoSaveConfig;
  out.storage.history = clampGroup(
    storage.history,
    base.storage.history as unknown as Record<string, unknown>,
  ) as unknown as HistoryConfig;

  // image
  const image = (r.image ?? {}) as Record<string, unknown>;
  out.image.defaultPath = clampSelect(image.defaultPath, base.image.defaultPath, [
    'absolute',
    'doc-dir',
    'specified-dir',
    'doc-subdir',
  ]) as ImagePathMode;
  out.image.specifiedDir = typeof image.specifiedDir === 'string' ? image.specifiedDir : '';
  out.image.docSubdir = typeof image.docSubdir === 'string' ? image.docSubdir : '';

  // fileTree
  const fileTree = (r.fileTree ?? {}) as Record<string, unknown>;
  out.fileTree.filter = typeof fileTree.filter === 'string' ? fileTree.filter : '';

  // recent
  out.recentFiles = clampStringArray(r.recentFiles);
  out.recentDirs = clampStringArray(r.recentDirs);
  return out;
}

function clampGroup(raw: unknown, def: Record<string, unknown>): Record<string, unknown> {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...def };
  for (const k of Object.keys(def)) {
    out[k] = clampLeaf(obj[k], def[k]);
  }
  return out;
}

function clampLeaf(raw: unknown, def: unknown): unknown {
  if (typeof def === 'boolean') return typeof raw === 'boolean' ? raw : def;
  if (typeof def === 'number') {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) return def;
    return n;
  }
  if (typeof def === 'string') return typeof raw === 'string' ? raw : def;
  return def;
}

function clampSelect(raw: unknown, def: string, allowed: string[]): string {
  return typeof raw === 'string' && allowed.includes(raw) ? raw : def;
}

function clampStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string').slice(0, 50) : [];
}

// ===== 持久化 =====

let _configDirCache: string | null = null;

export async function getConfigDir(): Promise<string> {
  if (_configDirCache) return _configDirCache;
  const dir = await appConfigDir();
  _configDirCache = dir;
  return dir;
}

export async function getConfigPath(): Promise<string> {
  return join(await getConfigDir(), 'config.json');
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const path = await getConfigPath();
    const text = await readTextFile(path);
    return validateConfig(JSON.parse(text));
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const dir = await getConfigDir();
  await createDirAll(dir);
  const path = join(dir, 'config.json');
  await writeTextFile(path, JSON.stringify(config, null, 2));
}
