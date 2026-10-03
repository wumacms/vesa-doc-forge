#!/usr/bin/env node
/**
 * 一次性主题生成器（非运行时依赖）：
 * 按各主题官方色板（hex）生成 src/styles/themes/<id>.css，
 * 令牌结构与 github.css 保持一致；hex→oklch 数学与 hex2oklch.cjs 相同。
 * 用法：node scripts/tools/genThemeCss.cjs
 */
const fs = require("fs");
const path = require("path");

const gammaDecode = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

function hexToOklch(hex) {
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  const r = gammaDecode(parseInt(h.slice(1, 3), 16) / 255);
  const g = gammaDecode(parseInt(h.slice(3, 5), 16) / 255);
  const b = gammaDecode(parseInt(h.slice(5, 7), 16) / 255);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675718 * s_;
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  const fmt = (v, d) => {
    const s = v.toFixed(d);
    return s.replace(/\.?0+$/, (mm) => (mm.includes(".") ? mm : ""));
  };
  return C < 1e-4 ? `oklch(${fmt(L, 4)} 0 ${fmt(H, 4)})` : `oklch(${fmt(L, 4)} ${fmt(C, 4)} ${fmt(H, 4)})`;
}

/** 主题色板：slot 名 → hex。light/dark 各一份。 */
const THEMES = {
  dracula: {
    title: "Dracula 夜紫（官方暗色色板；亮色为柔和薰衣草变体）",
    light: {
      background: "#f9f8fd", foreground: "#2d2640",
      card: "#f1eefb", cardFg: "#2d2640", popover: "#ffffff", popoverFg: "#2d2640",
      primary: "#7c5cbf", primaryFg: "#ffffff", secondary: "#e8e3f5", secondaryFg: "#2d2640",
      muted: "#efeaf9", mutedFg: "#6f6a8a", accent: "#e8e3f5", accentFg: "#5a3d99",
      destructive: "#d1365b", destructiveFg: "#ffffff", border: "#d8d1ea", input: "#efeaf9", ring: "#7c5cbf",
      sidebar: "#f1eefb", sidebarFg: "#2d2640", sidebarPrimary: "#7c5cbf", sidebarPrimaryFg: "#ffffff",
      sidebarAccent: "#e8e3f5", sidebarAccentFg: "#5a3d99", sidebarBorder: "#d8d1ea", sidebarRing: "#7c5cbf",
      charts: ["#0e9bb5", "#2da84f", "#d97a2b", "#d6439a", "#7c5cbf"],
      hljs: { bg: "#f1eefb", fg: "#2d2640", comment: "#8a84a5", keyword: "#b3368c", string: "#8a6d1f", number: "#7c5cbf", title: "#2da84f", attr: "#0e8aa0", builtIn: "#0e8aa0", literal: "#7c5cbf", meta: "#8a84a5", tag: "#b3368c" },
      monaco: { bg: "#ffffff", fg: "#2d2640", ln: "#9b95b8", lnActive: "#2d2640", selection: "#ddd1f5", lineHighlight: "#f1eefb", widgetBg: "#ffffff", widgetBorder: "#d8d1ea" },
      mermaid: "default",
    },
    dark: {
      background: "#282a36", foreground: "#f8f8f2",
      card: "#44475a", cardFg: "#f8f8f2", popover: "#44475a", popoverFg: "#f8f8f2",
      primary: "#bd93f9", primaryFg: "#282a36", secondary: "#44475a", secondaryFg: "#f8f8f2",
      muted: "#44475a", mutedFg: "#6272a4", accent: "#6272a4", accentFg: "#f8f8f2",
      destructive: "#ff5555", destructiveFg: "#282a36", border: "#6272a4", input: "#44475a", ring: "#bd93f9",
      sidebar: "#21222c", sidebarFg: "#f8f8f2", sidebarPrimary: "#bd93f9", sidebarPrimaryFg: "#282a36",
      sidebarAccent: "#44475a", sidebarAccentFg: "#f8f8f2", sidebarBorder: "#6272a4", sidebarRing: "#bd93f9",
      charts: ["#8be9fd", "#50fa7b", "#ffb86c", "#ff79c6", "#bd93f9"],
      hljs: { bg: "#44475a", fg: "#f8f8f2", comment: "#6272a4", keyword: "#ff79c6", string: "#f1fa8c", number: "#bd93f9", title: "#50fa7b", attr: "#50fa7b", builtIn: "#8be9fd", literal: "#bd93f9", meta: "#8be9fd", tag: "#ff79c6" },
      monaco: { bg: "#282a36", fg: "#f8f8f2", ln: "#6272a4", lnActive: "#f8f8f2", selection: "#44475a", lineHighlight: "#44475a", widgetBg: "#44475a", widgetBorder: "#6272a4" },
      mermaid: "dark",
    },
  },
  solarized: {
    title: "Solarized（Ethan Schoonover 官方精确色板，低对比护眼）",
    light: {
      background: "#fdf6e3", foreground: "#073642",
      card: "#eee8d5", cardFg: "#073642", popover: "#fdf6e3", popoverFg: "#073642",
      primary: "#268bd2", primaryFg: "#fdf6e3", secondary: "#eee8d5", secondaryFg: "#073642",
      muted: "#eee8d5", mutedFg: "#93a1a1", accent: "#e8e0c6", accentFg: "#268bd2",
      destructive: "#dc322f", destructiveFg: "#fdf6e3", border: "#d3ccb7", input: "#eee8d5", ring: "#268bd2",
      sidebar: "#eee8d5", sidebarFg: "#073642", sidebarPrimary: "#268bd2", sidebarPrimaryFg: "#fdf6e3",
      sidebarAccent: "#e8e0c6", sidebarAccentFg: "#268bd2", sidebarBorder: "#d3ccb7", sidebarRing: "#268bd2",
      charts: ["#268bd2", "#859900", "#d33682", "#cb4b16", "#2aa198"],
      hljs: { bg: "#eee8d5", fg: "#657b83", comment: "#93a1a1", keyword: "#859900", string: "#2aa198", number: "#d33682", title: "#268bd2", attr: "#b58900", builtIn: "#cb4b16", literal: "#6c71c4", meta: "#93a1a1", tag: "#6c71c4" },
      monaco: { bg: "#fdf6e3", fg: "#073642", ln: "#93a1a1", lnActive: "#073642", selection: "#e3ddc0", lineHighlight: "#eee8d5", widgetBg: "#fdf6e3", widgetBorder: "#d3ccb7" },
      mermaid: "default",
    },
    dark: {
      background: "#002b36", foreground: "#eee8d5",
      card: "#073642", cardFg: "#eee8d5", popover: "#073642", popoverFg: "#eee8d5",
      primary: "#2aa198", primaryFg: "#002b36", secondary: "#073642", secondaryFg: "#eee8d5",
      muted: "#073642", mutedFg: "#93a1a1", accent: "#0f4451", accentFg: "#2aa198",
      destructive: "#dc322f", destructiveFg: "#fdf6e3", border: "#0f4451", input: "#073642", ring: "#2aa198",
      sidebar: "#00212b", sidebarFg: "#eee8d5", sidebarPrimary: "#2aa198", sidebarPrimaryFg: "#002b36",
      sidebarAccent: "#073642", sidebarAccentFg: "#2aa198", sidebarBorder: "#0f4451", sidebarRing: "#2aa198",
      charts: ["#268bd2", "#859900", "#d33682", "#cb4b16", "#2aa198"],
      hljs: { bg: "#073642", fg: "#eee8d5", comment: "#657b83", keyword: "#859900", string: "#2aa198", number: "#d33682", title: "#268bd2", attr: "#b58900", builtIn: "#cb4b16", literal: "#6c71c4", meta: "#657b83", tag: "#6c71c4" },
      monaco: { bg: "#002b36", fg: "#eee8d5", ln: "#586e75", lnActive: "#eee8d5", selection: "#0d4f63", lineHighlight: "#073642", widgetBg: "#073642", widgetBorder: "#0f4451" },
      mermaid: "dark",
    },
  },
  monokai: {
    title: "Monokai（Sublime 经典高饱和撞色；亮色为经典浅变体）",
    light: {
      background: "#fafaf5", foreground: "#3b3a30",
      card: "#f1f0e6", cardFg: "#3b3a30", popover: "#ffffff", popoverFg: "#3b3a30",
      primary: "#b52e6c", primaryFg: "#ffffff", secondary: "#ecead9", secondaryFg: "#3b3a30",
      muted: "#f1f0e6", mutedFg: "#77755f", accent: "#ecead9", accentFg: "#5c7d16",
      destructive: "#cf2b5b", destructiveFg: "#ffffff", border: "#dcd9c5", input: "#f1f0e6", ring: "#b52e6c",
      sidebar: "#f1f0e6", sidebarFg: "#3b3a30", sidebarPrimary: "#b52e6c", sidebarPrimaryFg: "#ffffff",
      sidebarAccent: "#ecead9", sidebarAccentFg: "#5c7d16", sidebarBorder: "#dcd9c5", sidebarRing: "#b52e6c",
      charts: ["#0e8aa0", "#6d9a1e", "#d97a2b", "#c0276f", "#7c5cbf"],
      hljs: { bg: "#f1f0e6", fg: "#3b3a30", comment: "#8a8877", keyword: "#0e8aa0", string: "#8a6d1f", number: "#7c5cbf", title: "#5c7d16", attr: "#0e8aa0", builtIn: "#0e8aa0", literal: "#7c5cbf", meta: "#8a8877", tag: "#c0276f" },
      monaco: { bg: "#ffffff", fg: "#3b3a30", ln: "#a3a18b", lnActive: "#3b3a30", selection: "#e8e2c4", lineHighlight: "#f6f5ea", widgetBg: "#ffffff", widgetBorder: "#dcd9c5" },
      mermaid: "default",
    },
    dark: {
      background: "#272822", foreground: "#f8f8f2",
      card: "#383931", cardFg: "#f8f8f2", popover: "#383931", popoverFg: "#f8f8f2",
      primary: "#f92672", primaryFg: "#272822", secondary: "#3e3d32", secondaryFg: "#f8f8f2",
      muted: "#3e3d32", mutedFg: "#9d9a8c", accent: "#49483e", accentFg: "#a6e22e",
      destructive: "#f92672", destructiveFg: "#ffffff", border: "#49483e", input: "#3e3d32", ring: "#f92672",
      sidebar: "#252520", sidebarFg: "#f8f8f2", sidebarPrimary: "#f92672", sidebarPrimaryFg: "#ffffff",
      sidebarAccent: "#3e3d32", sidebarAccentFg: "#a6e22e", sidebarBorder: "#49483e", sidebarRing: "#f92672",
      charts: ["#66d9ef", "#a6e22e", "#f92672", "#fd971f", "#ae81ff"],
      hljs: { bg: "#3e3d32", fg: "#f8f8f2", comment: "#75715e", keyword: "#66d9ef", string: "#e6db74", number: "#ae81ff", title: "#a6e22e", attr: "#66d9ef", builtIn: "#66d9ef", literal: "#ae81ff", meta: "#75715e", tag: "#f92672" },
      monaco: { bg: "#272822", fg: "#f8f8f2", ln: "#75715e", lnActive: "#f8f8f2", selection: "#49483e", lineHighlight: "#3e3d32", widgetBg: "#3e3d32", widgetBorder: "#49483e" },
      mermaid: "dark",
    },
  },
  gruvbox: {
    title: "Gruvbox（Pavel Pertsev 官方 retro groove，暖棕双生色板）",
    light: {
      background: "#fbf1c7", foreground: "#3c3836",
      card: "#ebdbb2", cardFg: "#3c3836", popover: "#fbf1c7", popoverFg: "#3c3836",
      primary: "#af3a03", primaryFg: "#fbf1c7", secondary: "#ebdbb2", secondaryFg: "#3c3836",
      muted: "#ebdbb2", mutedFg: "#7c6f64", accent: "#d5c4a1", accentFg: "#427b58",
      destructive: "#cc241d", destructiveFg: "#fbf1c7", border: "#d5c4a1", input: "#ebdbb2", ring: "#af3a03",
      sidebar: "#f2e5bc", sidebarFg: "#3c3836", sidebarPrimary: "#af3a03", sidebarPrimaryFg: "#fbf1c7",
      sidebarAccent: "#ebdbb2", sidebarAccentFg: "#427b58", sidebarBorder: "#d5c4a1", sidebarRing: "#af3a03",
      charts: ["#076678", "#79740e", "#b16286", "#af3a03", "#427b58"],
      hljs: { bg: "#ebdbb2", fg: "#3c3836", comment: "#928374", keyword: "#9d0006", string: "#79740e", number: "#b16286", title: "#427b58", attr: "#076678", builtIn: "#af3a03", literal: "#b16286", meta: "#928374", tag: "#076678" },
      monaco: { bg: "#fbf1c7", fg: "#3c3836", ln: "#bdae93", lnActive: "#3c3836", selection: "#d5c4a1", lineHighlight: "#f2e5bc", widgetBg: "#fbf1c7", widgetBorder: "#d5c4a1" },
      mermaid: "default",
    },
    dark: {
      background: "#282828", foreground: "#ebdbb2",
      card: "#3c3836", cardFg: "#ebdbb2", popover: "#3c3836", popoverFg: "#ebdbb2",
      primary: "#fe8019", primaryFg: "#282828", secondary: "#3c3836", secondaryFg: "#ebdbb2",
      muted: "#3c3836", mutedFg: "#a89984", accent: "#504945", accentFg: "#b8bb26",
      destructive: "#fb4934", destructiveFg: "#282828", border: "#504945", input: "#3c3836", ring: "#fe8019",
      sidebar: "#1d2021", sidebarFg: "#ebdbb2", sidebarPrimary: "#fe8019", sidebarPrimaryFg: "#1d2021",
      sidebarAccent: "#3c3836", sidebarAccentFg: "#b8bb26", sidebarBorder: "#504945", sidebarRing: "#fe8019",
      charts: ["#83a598", "#b8bb26", "#d3869b", "#fe8019", "#8ec07c"],
      hljs: { bg: "#32302f", fg: "#ebdbb2", comment: "#928374", keyword: "#fb4934", string: "#b8bb26", number: "#d3869b", title: "#8ec07c", attr: "#83a598", builtIn: "#fe8019", literal: "#d3869b", meta: "#a89984", tag: "#83a598" },
      monaco: { bg: "#282828", fg: "#ebdbb2", ln: "#665c54", lnActive: "#ebdbb2", selection: "#4a4543", lineHighlight: "#32302f", widgetBg: "#3c3836", widgetBorder: "#504945" },
      mermaid: "dark",
    },
  },
  catppuccin: {
    title: "Catppuccin（官方 Mocha / Latte 双风味）",
    light: {
      background: "#eff1f5", foreground: "#4c4f69",
      card: "#ffffff", cardFg: "#4c4f69", popover: "#ffffff", popoverFg: "#4c4f69",
      primary: "#8839ef", primaryFg: "#ffffff", secondary: "#e6e9ef", secondaryFg: "#4c4f69",
      muted: "#e6e9ef", mutedFg: "#6c6f85", accent: "#ccd0da", accentFg: "#7287fd",
      destructive: "#d20f3f", destructiveFg: "#ffffff", border: "#bcc0cc", input: "#e6e9ef", ring: "#8839ef",
      sidebar: "#e6e9ef", sidebarFg: "#4c4f69", sidebarPrimary: "#8839ef", sidebarPrimaryFg: "#ffffff",
      sidebarAccent: "#dce0e8", sidebarAccentFg: "#7287fd", sidebarBorder: "#bcc0cc", sidebarRing: "#8839ef",
      charts: ["#1e66f5", "#40a02b", "#d20f3f", "#fe640b", "#179299"],
      hljs: { bg: "#e6e9ef", fg: "#4c4f69", comment: "#9ca0b0", keyword: "#8839ef", string: "#40a02b", number: "#fe640b", title: "#1e66f5", attr: "#ea76cb", builtIn: "#04a5e5", literal: "#fe640b", meta: "#9ca0b0", tag: "#7287fd" },
      monaco: { bg: "#eff1f5", fg: "#4c4f69", ln: "#9ca0b0", lnActive: "#4c4f69", selection: "#ccd0da", lineHighlight: "#e6e9ef", widgetBg: "#ffffff", widgetBorder: "#bcc0cc" },
      mermaid: "default",
    },
    dark: {
      background: "#1e1e2e", foreground: "#cdd6f4",
      card: "#313244", cardFg: "#cdd6f4", popover: "#313244", popoverFg: "#cdd6f4",
      primary: "#cba6f7", primaryFg: "#1e1e2e", secondary: "#313244", secondaryFg: "#cdd6f4",
      muted: "#313244", mutedFg: "#a6adc8", accent: "#45475a", accentFg: "#b4befe",
      destructive: "#f38ba8", destructiveFg: "#1e1e2e", border: "#45475a", input: "#313244", ring: "#cba6f7",
      sidebar: "#181825", sidebarFg: "#cdd6f4", sidebarPrimary: "#cba6f7", sidebarPrimaryFg: "#1e1e2e",
      sidebarAccent: "#313244", sidebarAccentFg: "#b4befe", sidebarBorder: "#313244", sidebarRing: "#cba6f7",
      charts: ["#89b4fa", "#a6e3a1", "#f38ba8", "#fab387", "#94e2d5"],
      hljs: { bg: "#313244", fg: "#cdd6f4", comment: "#6c7086", keyword: "#cba6f7", string: "#a6e3a1", number: "#fab387", title: "#89b4fa", attr: "#f5c2e7", builtIn: "#89dceb", literal: "#fab387", meta: "#6c7086", tag: "#f38ba8" },
      monaco: { bg: "#1e1e2e", fg: "#cdd6f4", ln: "#6c7086", lnActive: "#cdd6f4", selection: "#45475a", lineHighlight: "#313244", widgetBg: "#313244", widgetBorder: "#45475a" },
      mermaid: "dark",
    },
  },
  "tokyo-night": {
    title: "Tokyo Night（官方 Night / Light 色板，蓝紫霓虹）",
    light: {
      background: "#f4f5f7", foreground: "#343b58",
      card: "#e9eaee", cardFg: "#343b58", popover: "#ffffff", popoverFg: "#343b58",
      primary: "#3760bd", primaryFg: "#f4f5f7", secondary: "#e1e2e7", secondaryFg: "#343b58",
      muted: "#e1e2e7", mutedFg: "#656c94", accent: "#dfe2ea", accentFg: "#3760bd",
      destructive: "#b33e50", destructiveFg: "#ffffff", border: "#c9cedd", input: "#e1e2e7", ring: "#3760bd",
      sidebar: "#e9eaee", sidebarFg: "#343b58", sidebarPrimary: "#3760bd", sidebarPrimaryFg: "#ffffff",
      sidebarAccent: "#dfe2ea", sidebarAccentFg: "#7847bd", sidebarBorder: "#c9cedd", sidebarRing: "#3760bd",
      charts: ["#3760bd", "#38671c", "#b33e50", "#b15c2c", "#7847bd"],
      hljs: { bg: "#e6e8ee", fg: "#343b58", comment: "#939ab4", keyword: "#7847bd", string: "#38671c", number: "#b15c2c", title: "#3760bd", attr: "#b15c2c", builtIn: "#0f7894", literal: "#b15c2c", meta: "#939ab4", tag: "#b33e50" },
      monaco: { bg: "#f4f5f7", fg: "#343b58", ln: "#8f95ae", lnActive: "#343b58", selection: "#c9d3ec", lineHighlight: "#e4e5ea", widgetBg: "#ffffff", widgetBorder: "#c9cedd" },
      mermaid: "default",
    },
    dark: {
      background: "#1a1b26", foreground: "#c0caf5",
      card: "#1f2335", cardFg: "#c0caf5", popover: "#1f2335", popoverFg: "#c0caf5",
      primary: "#7aa2f7", primaryFg: "#1a1b26", secondary: "#292e42", secondaryFg: "#c0caf5",
      muted: "#292e42", mutedFg: "#a9b1d7", accent: "#292e42", accentFg: "#7aa2f7",
      destructive: "#f7768e", destructiveFg: "#1a1b26", border: "#3b4261", input: "#292e42", ring: "#7aa2f7",
      sidebar: "#16161e", sidebarFg: "#c0caf5", sidebarPrimary: "#7aa2f7", sidebarPrimaryFg: "#16161e",
      sidebarAccent: "#292e42", sidebarAccentFg: "#bb9af7", sidebarBorder: "#3b4261", sidebarRing: "#7aa2f7",
      charts: ["#7aa2f7", "#9ece6a", "#f7768e", "#ff9e64", "#bb9af7"],
      hljs: { bg: "#24283b", fg: "#c0caf5", comment: "#565f89", keyword: "#bb9af7", string: "#9ece6a", number: "#ff9e64", title: "#7aa2f7", attr: "#7dcfff", builtIn: "#7dcfff", literal: "#ff9e64", meta: "#565f89", tag: "#f7768e" },
      monaco: { bg: "#1a1b26", fg: "#c0caf5", ln: "#3b4261", lnActive: "#c0caf5", selection: "#283457", lineHighlight: "#292e42", widgetBg: "#24283b", widgetBorder: "#3b4261" },
      mermaid: "dark",
    },
  },
  zenburn: {
    title: "Zenburn（低对比护眼神经灰绿；亮色为暖纸变体）",
    light: {
      background: "#f5f4ec", foreground: "#3f3f3f",
      card: "#ecead9", cardFg: "#3f3f3f", popover: "#fdfcf6", popoverFg: "#3f3f3f",
      primary: "#b06e6e", primaryFg: "#ffffff", secondary: "#ecead9", secondaryFg: "#3f3f3f",
      muted: "#ecead9", mutedFg: "#7a7a6a", accent: "#e2dfc8", accentFg: "#5c705c",
      destructive: "#b04a4a", destructiveFg: "#ffffff", border: "#d5d2bd", input: "#ecead9", ring: "#b06e6e",
      sidebar: "#ecead9", sidebarFg: "#3f3f3f", sidebarPrimary: "#b06e6e", sidebarPrimaryFg: "#ffffff",
      sidebarAccent: "#e2dfc8", sidebarAccentFg: "#5c705c", sidebarBorder: "#d5d2bd", sidebarRing: "#b06e6e",
      charts: ["#4a8f96", "#7a8f3f", "#b06e6e", "#c07f3f", "#8f5c96"],
      hljs: { bg: "#ecead9", fg: "#3f3f3f", comment: "#909070", keyword: "#756b23", string: "#9c4a4a", number: "#3f7f8a", title: "#5c705c", attr: "#8a5c2e", builtIn: "#3f7f8a", literal: "#8a5c2e", meta: "#909070", tag: "#9c4a4a" },
      monaco: { bg: "#fdfcf6", fg: "#3f3f3f", ln: "#a8a890", lnActive: "#3f3f3f", selection: "#d8d4bc", lineHighlight: "#f0eede", widgetBg: "#fdfcf6", widgetBorder: "#d5d2bd" },
      mermaid: "default",
    },
    dark: {
      background: "#3f3f3f", foreground: "#dcdccc",
      card: "#484848", cardFg: "#dcdccc", popover: "#484848", popoverFg: "#dcdccc",
      primary: "#f0dfaf", primaryFg: "#3f3f3f", secondary: "#4d4d4d", secondaryFg: "#dcdccc",
      muted: "#484848", mutedFg: "#9fafaf", accent: "#636363", accentFg: "#f0dfaf",
      destructive: "#cc9393", destructiveFg: "#2f2f2f", border: "#636363", input: "#4d4d4d", ring: "#f0dfaf",
      sidebar: "#2f2f2f", sidebarFg: "#dcdccc", sidebarPrimary: "#f0dfaf", sidebarPrimaryFg: "#2f2f2f",
      sidebarAccent: "#484848", sidebarAccentFg: "#93e0e3", sidebarBorder: "#636363", sidebarRing: "#f0dfaf",
      charts: ["#93e0e3", "#f0dfaf", "#cc9393", "#dfaf8f", "#dc8cc3"],
      hljs: { bg: "#484848", fg: "#dcdccc", comment: "#7f9f7f", keyword: "#f0dfaf", string: "#cc9393", number: "#8cd0d3", title: "#93e0e3", attr: "#dfaf8f", builtIn: "#8cd0d3", literal: "#dfaf8f", meta: "#7f9f7f", tag: "#cc9393" },
      monaco: { bg: "#3f3f3f", fg: "#dcdccc", ln: "#626262", lnActive: "#dcdccc", selection: "#636363", lineHighlight: "#484848", widgetBg: "#484848", widgetBorder: "#636363" },
      mermaid: "dark",
    },
  },
};

function block(sel, title, p) {
  const v = (hex) => hexToOklch(hex);
  const lines = [];
  const put = (name, hex) => lines.push(`  --color-${name}: ${v(hex)}; /* ${hex} */`);
  lines.push(`/* ─── ${title} ─── */`);
  lines.push(`${sel} {`);
  put("background", p.background);
  put("foreground", p.foreground);
  put("card", p.card);
  put("card-foreground", p.cardFg);
  put("popover", p.popover);
  put("popover-foreground", p.popoverFg);
  put("primary", p.primary);
  put("primary-foreground", p.primaryFg);
  put("secondary", p.secondary);
  put("secondary-foreground", p.secondaryFg);
  put("muted", p.muted);
  put("muted-foreground", p.mutedFg);
  put("accent", p.accent);
  put("accent-foreground", p.accentFg);
  put("destructive", p.destructive);
  put("destructive-foreground", p.destructiveFg);
  put("border", p.border);
  put("input", p.input);
  put("ring", p.ring);
  put("sidebar", p.sidebar);
  put("sidebar-foreground", p.sidebarFg);
  put("sidebar-primary", p.sidebarPrimary);
  put("sidebar-primary-foreground", p.sidebarPrimaryFg);
  put("sidebar-accent", p.sidebarAccent);
  put("sidebar-accent-foreground", p.sidebarAccentFg);
  put("sidebar-border", p.sidebarBorder);
  put("sidebar-ring", p.sidebarRing);
  p.charts.forEach((c, i) => put(`chart-${i + 1}`, c));
  lines.push("");
  const hp = (name, hex) => lines.push(`  --hljs-${name}: ${v(hex)}; /* ${hex} */`);
  hp("bg", p.hljs.bg);
  hp("fg", p.hljs.fg);
  hp("comment", p.hljs.comment);
  hp("keyword", p.hljs.keyword);
  hp("string", p.hljs.string);
  hp("number", p.hljs.number);
  hp("title", p.hljs.title);
  hp("attr", p.hljs.attr);
  hp("built_in", p.hljs.builtIn);
  hp("literal", p.hljs.literal);
  hp("meta", p.hljs.meta);
  hp("tag", p.hljs.tag);
  lines.push("");
  const mp = (name, hex) => lines.push(`  --monaco-${name}: ${v(hex)}; /* ${hex} */`);
  mp("bg", p.monaco.bg);
  mp("fg", p.monaco.fg);
  mp("line-number", p.monaco.ln);
  mp("line-number-active", p.monaco.lnActive);
  mp("selection", p.monaco.selection);
  mp("line-highlight", p.monaco.lineHighlight);
  mp("widget-bg", p.monaco.widgetBg);
  mp("widget-border", p.monaco.widgetBorder);
  lines.push("");
  lines.push(`  --mermaid-theme: ${p.mermaid};`);
  lines.push("}");
  return lines.join("\n");
}

const outDir = path.resolve(__dirname, "../../src/styles/themes");
for (const [id, t] of Object.entries(THEMES)) {
  const css = [
    "/* ============================================================",
    `   ${t.title}`,
    "   由 scripts/tools/genThemeCss.cjs 生成（hex 经 oklch 精确换算）。",
    "   ============================================================ */",
    "",
    block(`[data-style="${id}"]`, "Light", t.light),
    "",
    block(`[data-style="${id}"].dark`, "Dark", t.dark),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, `${id}.css`), css);
  console.log(`✓ ${id}.css  (${css.split("\n").length} lines)`);
}
