export type ThemeMode = 'dark' | 'light';

export interface ThemeMeta {
  id: string;
  name: string;
  group: string;
  /** 该主题支持的模式列表。若仅含一个，则另一模式回退到此模式。 */
  modes: ThemeMode[];
  /** 切换器中展示的色板，按模式分别给出。 */
  swatch: Record<ThemeMode, [string, string, string]>;
}

export const themes: ThemeMeta[] = [
  {
    id: 'material-ocean',
    name: 'Ocean',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#0F111A', '#84FFFF', '#C792EA'],
      light: ['#FAFAFA', '#00897B', '#4A5C6A'],
    },
  },
  {
    id: 'material-palenight',
    name: 'Palenight',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#292D3E', '#C792EA', '#82AAFF'],
      light: ['#F2F0FF', '#7C4DFF', '#6182B8'],
    },
  },
  {
    id: 'material-darker',
    name: 'Darker',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#212121', '#FFCB6B', '#82AAFF'],
      light: ['#FAFAFA', '#F9A825', '#1565C0'],
    },
  },
  {
    id: 'material-deep-ocean',
    name: 'Deep Ocean',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#0F111A', '#84FFFF', '#546E7A'],
      light: ['#F5F7F8', '#00838F', '#1565C0'],
    },
  },
  {
    id: 'cursor-dark',
    name: 'Cursor Dark',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#1A1A1A', '#88C0D0', '#83D6C5'],
      light: ['#FAFAFA', '#2D8B8B', '#1E6FDB'],
    },
  },
  // ===== theme-factory 内置主题（10 个，均同时支持 dark + light） =====
  {
    id: 'factory-ocean-depths',
    name: 'Ocean Depths',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#1A2332', '#2D8B8B', '#A8DADC'],
      light: ['#F1FAEE', '#2D8B8B', '#1A2332'],
    },
  },
  {
    id: 'factory-sunset-boulevard',
    name: 'Sunset Boulevard',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#264653', '#E76F51', '#F4A261'],
      light: ['#FAF3E8', '#E76F51', '#264653'],
    },
  },
  {
    id: 'factory-forest-canopy',
    name: 'Forest Canopy',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#1F3320', '#A4AC86', '#7D8471'],
      light: ['#FAF9F6', '#2D4A2B', '#7D8471'],
    },
  },
  {
    id: 'factory-modern-minimalist',
    name: 'Modern Minimalist',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#2A3540', '#A0B0C0', '#708090'],
      light: ['#FFFFFF', '#36454F', '#708090'],
    },
  },
  {
    id: 'factory-golden-hour',
    name: 'Golden Hour',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#2A2420', '#F4A900', '#C1666B'],
      light: ['#FAF3E8', '#C1666B', '#F4A900'],
    },
  },
  {
    id: 'factory-arctic-frost',
    name: 'Arctic Frost',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#1A2638', '#4A6FA5', '#D4E4F7'],
      light: ['#FAFAFA', '#4A6FA5', '#2A3A4A'],
    },
  },
  {
    id: 'factory-desert-rose',
    name: 'Desert Rose',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#2A1A28', '#D4A5A5', '#B87D6D'],
      light: ['#FAF3EE', '#B87D6D', '#5D2E46'],
    },
  },
  {
    id: 'factory-tech-innovation',
    name: 'Tech Innovation',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#1E1E1E', '#0066FF', '#00FFFF'],
      light: ['#FFFFFF', '#0066FF', '#00AAAA'],
    },
  },
  {
    id: 'factory-botanical-garden',
    name: 'Botanical Garden',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#1F3324', '#4A7C59', '#F9A620'],
      light: ['#F5F3ED', '#4A7C59', '#B7472A'],
    },
  },
  {
    id: 'factory-midnight-galaxy',
    name: 'Midnight Galaxy',
    group: 'Builtin',
    modes: ['dark', 'light'],
    swatch: {
      dark: ['#1A1228', '#A490C2', '#4A4E8F'],
      light: ['#F5F0FA', '#4A4E8F', '#2B1E3E'],
    },
  },
];

export const defaultThemeId = themes[0].id;

/** 默认主题模式。 */
export const defaultThemeMode: ThemeMode = 'dark';

/**
 * 给定主题与期望模式，返回实际生效的模式。
 * 若主题不支持期望模式，则回退到主题的唯一支持模式。
 */
export function resolveMode(theme: ThemeMeta, requested: ThemeMode): ThemeMode {
  if (theme.modes.includes(requested)) return requested;
  return theme.modes[0];
}
