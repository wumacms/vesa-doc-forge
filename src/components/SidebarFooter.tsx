/**
 * 侧边栏底部页脚：工作区与全局操作的统一入口。
 * 导入文件 / 导入文件夹 / 界面风格 / 主题模式 / 清空工作区，
 * 全部为无文字图标按钮（title + aria-label 提供可访问名称）。
 */
import { useEffect, useRef, useState } from "react";
import { FolderUp, Moon, Sun, Trash2, Upload } from "lucide-react";
import { useTheme } from "next-themes";
import { StyleSwitcher } from "@/components/StyleSwitcher";
import { supportedExtensions } from "@/lib/workspace";
import { cn } from "@/lib/utils";

interface Props {
  /** 用户选择了文件或文件夹后回调，由 App 走既有导入流程 */
  onImport: (list: FileList) => void;
  /** 清空工作区（App 侧弹确认框） */
  onClearAll: () => void;
  /** 工作区为空时禁用清空入口 */
  clearDisabled: boolean;
}

const THEME_ORDER = ["light", "dark"] as const;
const THEME_META: Record<(typeof THEME_ORDER)[number], { label: string; icon: typeof Sun }> = {
  light: { label: "浅色主题", icon: Sun },
  dark: { label: "深色主题", icon: Moon },
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current: (typeof THEME_ORDER)[number] = theme === "dark" ? "dark" : "light";
  const meta = THEME_META[current];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      title={meta.label}
      aria-label={meta.label}
      onClick={() => {
        const idx = THEME_ORDER.indexOf(current);
        setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
      }}
      className="p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {/* SSR/水合前固定图标，避免闪烁 */}
      <Icon className="h-4 w-4" aria-hidden />
      <span className="sr-only">{mounted ? meta.label : "切换主题"}</span>
    </button>
  );
}

const FOOTER_BTN =
  "p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

export default function SidebarFooter({ onImport, onClearAll, clearDisabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  // supportedExtensions() 返回 ".md,.json,..." 形式的字符串
  const accept = useRef<string>(supportedExtensions()).current;

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border px-1 py-1">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) onImport(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        aria-hidden
        // @ts-expect-error 非标准属性：选择整个文件夹
        webkitdirectory=""
        directory=""
        onChange={(e) => {
          if (e.target.files?.length) onImport(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          title="导入文件"
          aria-label="导入文件"
          className={FOOTER_BTN}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          title="导入文件夹"
          aria-label="导入文件夹"
          className={FOOTER_BTN}
          onClick={() => folderInputRef.current?.click()}
        >
          <FolderUp className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="flex items-center gap-0.5">
        <StyleSwitcher />
        <ThemeToggle />
        <button
          type="button"
          title={clearDisabled ? "工作区已是空的" : "清空所有文件和文件夹"}
          aria-label="清空所有文件和文件夹"
          disabled={clearDisabled}
          className={cn(FOOTER_BTN, "hover:text-destructive")}
          onClick={onClearAll}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
