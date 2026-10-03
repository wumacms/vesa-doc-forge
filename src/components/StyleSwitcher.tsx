/**
 * 风格选择下拉（规范 Phase 5）：
 * 展示注册表中的全部风格，带当前模式下的双色预览；选择后由
 * StyleProvider 写入 localStorage 并同步 html[data-style]。
 */
import { Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStyle } from "@/context/StyleContext";
import { useTheme } from "next-themes";

export function StyleSwitcher() {
  const { style, setStyle, availableStyles, meta } = useStyle();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={`界面风格：${meta.label}`}
          aria-label="选择界面风格"
          className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Palette className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">{meta.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>界面风格</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableStyles.map((t) => {
          const [primary, bg] = isDark ? t.previewColors.dark : t.previewColors.light;
          return (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => setStyle(t.id)}
              className="flex items-start gap-2"
            >
              <span
                className="mt-1 flex h-4 w-4 shrink-0 overflow-hidden border border-border"
                aria-hidden
              >
                <span className="h-full w-1/2" style={{ background: bg }} />
                <span className="h-full w-1/2" style={{ background: primary }} />
              </span>
              <span className="flex flex-col">
                <span>{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </span>
              {t.id === style && (
                <span className="ml-auto text-xs text-primary" aria-label="当前风格">
                  使用中
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
