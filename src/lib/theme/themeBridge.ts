/**
 * Monaco 主题动态桥接器（规范 §5.2）：
 * 运行时从 DOM 计算样式读取当前激活的 CSS 变量（已含风格 × 明暗的级联结果），
 * 经纯数学转换器得到 hex，动态 defineTheme + setTheme。
 * 彻底取代手动 oklch2hex 离线脚本工作流——新增主题零 TS 改动。
 */
import { monaco } from "@/lib/monacoSetup";
import { oklchToHex } from "./colorMath";

/** 读取 css 变量并转 hex；变量缺失时回退 fallbackVar，仍失败则兜底 */
function readVar(
  style: CSSStyleDeclaration,
  varName: string,
  fallbackVar: string,
): string {
  const raw = style.getPropertyValue(varName).trim();
  const value = raw || style.getPropertyValue(fallbackVar).trim();
  return value ? oklchToHex(value) : "#888888";
}

export interface ComputedThemeTokens {
  styleName: string;
  isDark: boolean;
  bg: string;
  fg: string;
  lineNo: string;
  lineNoActive: string;
  selection: string;
  lineHighlight: string;
  widgetBg: string;
  widgetBorder: string;
}

/** 从当前 DOM 提取并换算 Monaco 所需的全部颜色令牌 */
export function extractComputedTokens(): ComputedThemeTokens {
  const style = getComputedStyle(document.documentElement);
  return {
    styleName: document.documentElement.getAttribute("data-style")?.trim() || "docforge",
    isDark: document.documentElement.classList.contains("dark"),
    bg: readVar(style, "--monaco-bg", "--color-background"),
    fg: readVar(style, "--monaco-fg", "--color-foreground"),
    lineNo: readVar(style, "--monaco-line-number", "--color-muted-foreground"),
    lineNoActive: readVar(
      style,
      "--monaco-line-number-active",
      "--color-foreground",
    ),
    selection: readVar(style, "--monaco-selection", "--color-accent"),
    lineHighlight: readVar(style, "--monaco-line-highlight", "--color-accent"),
    widgetBg: readVar(style, "--monaco-widget-bg", "--color-popover"),
    widgetBorder: readVar(style, "--monaco-widget-border", "--color-border"),
  };
}

/** 已注册主题缓存：同一 style×mode 组合只 define 一次 */
const registered = new Set<string>();

let observerInstalled = false;

/**
 * 安装 DOM → Monaco 主题的自动同步桥。
 * 监听 html 上的 class（next-themes 明暗切换）与 data-style（风格切换），
 * 任一变化即重新提取 CSS 变量并 defineTheme/setTheme。
 * 幂等：重复调用只安装一次。
 */
export function installThemeBridge(): void {
  if (observerInstalled || typeof MutationObserver === "undefined") return;
  observerInstalled = true;

  // 微任务节流：同一帧内的多次 class/attribute 变更只同步一次
  let queued = false;
  const scheduleSync = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      syncMonacoThemeWithDOM();
    });
  };

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-style"],
  });

  // 初次安装时同步一次，覆盖 Monaco 晚于主题变更加载的场景
  syncMonacoThemeWithDOM();
}

/** 动态向 Monaco 注册并激活当前主题 */
export function syncMonacoThemeWithDOM(): void {
  try {
    const tokens = extractComputedTokens();
    const themeName = `docforge-${tokens.styleName}-${tokens.isDark ? "dark" : "light"}`;

    if (!registered.has(themeName)) {
      monaco.editor.defineTheme(themeName, {
        base: tokens.isDark ? "vs-dark" : "vs",
        inherit: true,
        rules: [
          // token 规则沿用 hljs 同源变量（background/foreground 由 colors 全局
          // 控制；语法着色交给各语言 tokenizer 的 base 主题，保持克制）
        ],
        colors: {
          "editor.background": tokens.bg,
          "editor.foreground": tokens.fg,
          "editorLineNumber.foreground": tokens.lineNo,
          "editorLineNumber.activeForeground": tokens.lineNoActive,
          "editor.selectionBackground": tokens.selection,
          "editor.lineHighlightBackground": tokens.lineHighlight,
          "editorWidget.background": tokens.widgetBg,
          "editorWidget.border": tokens.widgetBorder,
          "editorSuggestWidget.background": tokens.widgetBg,
          "editorSuggestWidget.border": tokens.widgetBorder,
          "editorHoverWidget.background": tokens.widgetBg,
          "editorHoverWidget.border": tokens.widgetBorder,
          "editorIndentGuide.background1": tokens.widgetBorder,
          "editorIndentGuide.activeBackground1": tokens.lineNo,
        },
      });
      registered.add(themeName);
    }
    monaco.editor.setTheme(themeName);
  } catch (err) {
    // 桥接失败绝不影响编辑：退回内置主题
    console.warn("[themeBridge] Monaco 主题同步失败，退回默认主题:", err);
    try {
      const isDark = document.documentElement.classList.contains("dark");
      monaco.editor.setTheme(isDark ? "vs-dark" : "vs");
    } catch {
      /* Monaco 尚未加载，忽略 */
    }
  }
}
