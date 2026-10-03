/**
 * 文档大纲面板：显示当前 Markdown 的标题层级，点击跳转。
 * 由 App 负责在侧边栏渲染（与 FileTree 互斥），tabs 插槽复用 SidebarTabs。
 */
import type { ReactNode } from "react";
import type { OutlineItem } from "@/lib/outline";
import { cn } from "@/lib/utils";

interface Props {
  items: OutlineItem[];
  /** 编辑器光标当前行（用于高亮所在小节）；编辑器未挂载时为 null */
  activeLine: number | null;
  onJump: (index: number, item: OutlineItem) => void;
  tabs: ReactNode;
}

export default function OutlinePane({ items, activeLine, onJump, tabs }: Props) {
  // 高亮"光标所处分节"：最后一个 line <= activeLine 的标题
  let activeIdx = -1;
  if (activeLine != null) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].line <= activeLine) activeIdx = i;
      else break;
    }
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center px-3 py-2.5">{tabs}</div>
      <nav
        className="min-h-0 flex-1 overflow-y-auto px-1 pb-2"
        aria-label="文档大纲"
      >
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            文档中还没有标题
            <br />
            <span className="text-xs opacity-70">以「# 标题」开始即可出现在这里</span>
          </p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((it, i) => (
              <li key={`${it.line}:${i}`}>
                <button
                  type="button"
                  onClick={() => onJump(i, it)}
                  title={it.text}
                  style={{ marginLeft: `${(it.level - 1) * 12}px` }}
                  className={cn(
                    "block truncate border-l-2 py-1 pl-2 pr-1 text-left text-[13px] transition-colors",
                    it.level === 1 && "font-medium",
                    i === activeIdx
                      ? "border-primary bg-accent text-foreground"
                      : "border-border/50 text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
                  )}
                >
                  {it.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
