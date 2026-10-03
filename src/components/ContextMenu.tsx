import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  /** 危险操作（如删除），用 destructive 配色 */
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface Props {
  /** 相对视口的触发坐标 */
  x: number;
  y: number;
  /** 菜单顶部的上下文标题（如节点名） */
  title?: string;
  items: ContextMenuItem[];
  onClose: () => void;
}

/**
 * 轻量右键菜单：fixed 定位 + 视口边界收敛。
 * 点击外部 / Esc / 滚动 / 窗口尺寸变化都会关闭，避免菜单"悬挂"。
 */
export default function ContextMenu({ x, y, title, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // 捕获阶段监听：侧边栏内部滚动时菜单坐标已失效
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={title ? `${title} 的菜单` : "菜单"}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-50 min-w-44 border border-border bg-popover py-1 shadow-lg shadow-black/20"
    >
      {title && (
        <p className="truncate px-3 pb-1 pt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          autoFocus
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
            "outline-none focus-visible:bg-accent",
            item.disabled
              ? "cursor-not-allowed opacity-40"
              : item.danger
                ? "text-destructive hover:bg-destructive/10"
                : "text-popover-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
