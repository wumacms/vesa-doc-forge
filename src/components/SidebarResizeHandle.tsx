/**
 * 侧边栏与主区之间的拖拽分隔条。
 *
 * 交互：拖拽改宽、双击复位、方向键微调（Shift 加速）；
 * 可访问性：role=separator + aria-value*，键盘可完整操作。
 */
import { cn } from "@/lib/utils";
import {
  KEY_STEP,
  KEY_STEP_FAST,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from "@/hooks/useSidebarResize";

interface Props {
  width: number;
  resizing: boolean;
  beginResize: (clientX: number) => void;
  moveResize: (clientX: number) => void;
  endResize: () => void;
  nudgeResize: (dx: number) => void;
  resetResize: () => void;
}

export default function SidebarResizeHandle({
  width,
  resizing,
  beginResize,
  moveResize,
  endResize,
  nudgeResize,
  resetResize,
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? KEY_STEP_FAST : KEY_STEP;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nudgeResize(-step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nudgeResize(step);
    } else if (e.key === "Home") {
      e.preventDefault();
      resetResize();
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="拖拽调整侧边栏宽度（双击复位，方向键微调）"
      title="拖拽调整侧边栏宽度 · 双击复位"
      tabIndex={0}
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      aria-valuenow={width}
      onKeyDown={handleKeyDown}
      onDoubleClick={resetResize}
      onPointerDown={(e) => {
        // 仅主键（或触摸/笔）触发拖拽，并捕获指针以支持移出元素后继续
        if (e.button !== 0 && e.pointerType === "mouse") return;
        e.currentTarget.setPointerCapture(e.pointerId);
        beginResize(e.clientX);
      }}
      onPointerMove={(e) => {
        if (resizing) moveResize(e.clientX);
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        endResize();
      }}
      onPointerCancel={endResize}
      className={cn(
        "group relative z-20 -ml-px w-2 shrink-0 cursor-col-resize touch-none outline-none",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent",
        "focus-visible:after:w-0.5 focus-visible:after:bg-primary",
        resizing
          ? "after:w-0.5 after:bg-primary"
          : "hover:after:bg-border",
      )}
    />
  );
}
