import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { THEME_REGISTRY, getThemeMeta, type ThemeMeta } from "@/styles/themeRegistry";
import { syncMonacoThemeWithDOM } from "@/lib/theme/themeBridge";

const STYLE_KEY = "docforge:style";

interface StyleContextValue {
  style: string;
  setStyle: (style: string) => void;
  availableStyles: ThemeMeta[];
  /** 当前风格的元数据（名称/描述等），供 UI 展示 */
  meta: ThemeMeta;
}

const StyleContext = createContext<StyleContextValue | null>(null);

export function StyleProvider({ children }: { children: ReactNode }) {
  const [style, setStyle] = useState<string>(() => {
    if (typeof window === "undefined") return "docforge";
    const saved = window.localStorage.getItem(STYLE_KEY);
    return THEME_REGISTRY.some((t) => t.id === saved)
      ? (saved as string)
      : "docforge";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-style", style);
    try {
      window.localStorage.setItem(STYLE_KEY, style);
    } catch {
      /* 隐私模式下忽略 */
    }
    syncMonacoThemeWithDOM();
  }, [style]);

  const setStyleCb = useCallback((next: string) => {
    if (THEME_REGISTRY.some((t) => t.id === next)) setStyle(next);
  }, []);

  const value = useMemo(
    () => ({ style, setStyle: setStyleCb, availableStyles: THEME_REGISTRY, meta: getThemeMeta(style) }),
    [style, setStyleCb],
  );

  return (
    <StyleContext.Provider value={value}>{children}</StyleContext.Provider>
  );
}

export function useStyle(): StyleContextValue {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error("useStyle 必须在 StyleProvider 内使用");
  return ctx;
}
