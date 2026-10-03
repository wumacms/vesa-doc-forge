/**
 * 侧边栏视图切换（Typora 式）：文件目录 <-> 文档大纲。
 * 仅在选中 Markdown 文件时由 App 渲染。
 */
import { FolderTree, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarTab = "files" | "outline";

export default function SidebarTabs({
  value,
  onChange,
}: {
  value: SidebarTab;
  onChange: (t: SidebarTab) => void;
}) {
  const tabs: { key: SidebarTab; label: string; icon: typeof FolderTree }[] = [
    { key: "files", label: "文件", icon: FolderTree },
    { key: "outline", label: "大纲", icon: ListTree },
  ];
  return (
    <div
      role="tablist"
      aria-label="侧边栏视图"
      className="flex items-center gap-0.5 border border-border bg-background p-0.5"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          title={t.label}
          aria-label={t.label}
          onClick={() => onChange(t.key)}
          className={cn(
            "flex items-center gap-1 px-1.5 py-1 text-xs transition-colors",
            value === t.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <t.icon className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden lg:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
