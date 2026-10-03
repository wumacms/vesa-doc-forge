/**
 * Mermaid 主题感知（规范 §5.3）：
 * 读取 CSS 变量 --mermaid-theme，并监听 html 上的 class / data-style 变化，
 * 供预览组件订阅以触发重渲染。
 */
import { useEffect, useState } from "react";

export type MermaidThemeName = "neutral" | "dark" | "default" | "forest";

const VALID: MermaidThemeName[] = ["neutral", "dark", "default", "forest"];

export function readMermaidTheme(): MermaidThemeName {
  if (typeof document === "undefined") return "neutral";
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue("--mermaid-theme")
    .trim() as MermaidThemeName;
  if (VALID.includes(computed)) return computed;
  return document.documentElement.classList.contains("dark") ? "dark" : "neutral";
}

export function useMermaidTheme(): MermaidThemeName {
  const [theme, setTheme] = useState<MermaidThemeName>(() => readMermaidTheme());

  useEffect(() => {
    const update = () => setTheme(readMermaidTheme());
    // 首帧后立刻校准一次：state 初值可能在 CSS 生效前读取
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-style"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
