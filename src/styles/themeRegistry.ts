/**
 * 风格元数据注册表：供 UI 渲染下拉选单与色块预览。
 * 新增主题时在此登记一条即可（配合 src/styles/themes/<id>.css）。
 */

export interface ThemeMeta {
  /** 对应 html 上的 data-style 值 */
  id: string;
  label: string;
  description: string;
  /** 供选择器展示的色块 [primary, bg] */
  previewColors: {
    light: [string, string];
    dark: [string, string];
  };
}

export const DEFAULT_STYLE = "docforge";

export const THEME_REGISTRY: ThemeMeta[] = [
  {
    id: "docforge",
    label: "DocForge 默认",
    description: "现代极简，默认设计语言",
    previewColors: {
      light: ["#3789c4", "#ffffff"],
      dark: ["#4ba3dd", "#000000"],
    },
  },
  {
    id: "github",
    label: "GitHub Primer",
    description: "GitHub 官方风格配色",
    previewColors: {
      light: ["#0969da", "#ffffff"],
      dark: ["#1f6feb", "#0d1117"],
    },
  },
  {
    id: "nord",
    label: "Nord 极光",
    description: "北极冰雪冷色调，柔和防疲劳",
    previewColors: {
      light: ["#5e81ac", "#eceff4"],
      dark: ["#88c0d0", "#2e3440"],
    },
  },
  {
    id: "dracula",
    label: "Dracula 夜紫",
    description: "经典吸血鬼紫，高饱和暗色传奇",
    previewColors: {
      light: ["#7c5cbf", "#f9f8fd"],
      dark: ["#bd93f9", "#282a36"],
    },
  },
  {
    id: "solarized",
    label: "Solarized",
    description: "科学配比低对比，护眼米黄与深青",
    previewColors: {
      light: ["#268bd2", "#fdf6e3"],
      dark: ["#2aa198", "#002b36"],
    },
  },
  {
    id: "monokai",
    label: "Monokai",
    description: "Sublime 经典撞色，热烈醒目",
    previewColors: {
      light: ["#b52e6c", "#fafaf5"],
      dark: ["#f92672", "#272822"],
    },
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    description: "复古暖棕，双生明暗色板",
    previewColors: {
      light: ["#af3a03", "#fbf1c7"],
      dark: ["#fe8019", "#282828"],
    },
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    description: "温和豆沙色，当代社区人气配色",
    previewColors: {
      light: ["#8839ef", "#eff1f5"],
      dark: ["#cba6f7", "#1e1e2e"],
    },
  },
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    description: "都市夜色蓝紫霓虹",
    previewColors: {
      light: ["#3760bd", "#f4f5f7"],
      dark: ["#7aa2f7", "#1a1b26"],
    },
  },
  {
    id: "zenburn",
    label: "Zenburn",
    description: "禅意灰绿，长时阅读零压力",
    previewColors: {
      light: ["#b06e6e", "#f5f4ec"],
      dark: ["#f0dfaf", "#3f3f3f"],
    },
  },
];

export function getThemeMeta(id: string): ThemeMeta {
  return THEME_REGISTRY.find((t) => t.id === id) ?? THEME_REGISTRY[0];
}
