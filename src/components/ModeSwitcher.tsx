/**
 * 顶栏视图模式切换器（edit / split / preview）。
 * 移动端不提供分屏；只读文件仅允许预览。
 */
import { Columns2, Eye, PenLine, type LucideIcon } from "lucide-react";
import type { ViewMode } from "@/types";
import { cn } from "@/lib/utils";

interface ModeEntry {
  key: ViewMode;
  label: string;
  icon: LucideIcon;
}

const MODE_ICONS: Record<ViewMode, LucideIcon> = {
  edit: PenLine,
  split: Columns2,
  preview: Eye,
};

interface Props {
  effectiveMode: ViewMode;
  editable: boolean;
  isMobile: boolean;
  onChange: (m: ViewMode) => void;
}

export default function ModeSwitcher({
  effectiveMode,
  editable,
  isMobile,
  onChange,
}: Props) {
  const modes: ModeEntry[] = [
    { key: "edit", label: "编辑", icon: MODE_ICONS.edit },
    // 移动端不提供分屏：空间不足，且 effectiveMode 已强制降级为预览
    ...(isMobile
      ? []
      : [{ key: "split" as ViewMode, label: "分屏", icon: MODE_ICONS.split }]),
    { key: "preview", label: "预览", icon: MODE_ICONS.preview },
  ];

  return (
    <div
      role="tablist"
      aria-label="视图模式"
      className="flex items-center gap-1 border border-border bg-background p-1"
    >
      {modes.map((m) => {
        const disabled = !editable && m.key !== "preview";
        return (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={effectiveMode === m.key}
            disabled={disabled}
            title={disabled ? "该文件类型只读" : m.label}
            aria-label={m.label}
            onClick={() => onChange(m.key)}
            className={cn(
              "flex h-7 w-7 items-center justify-center transition-colors",
              effectiveMode === m.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
              disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
          >
            <m.icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
