/**
 * 侧边栏宽度：支持拖拽调整 + localStorage 持久化。
 *
 * 设计要点：
 * - 拖拽过程中只更新内存状态（避免每像素一次 localStorage 写入），
 *   松手后（resizing 为 false）再落盘；
 * - 上限同时受固定最大值与视口宽度约束，窄屏下不会把主区挤没；
 * - 视口尺寸变化时对当前宽度重新钳制，防止恢复出越界的持久化值。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getPref, setPref } from "@/lib/storage";

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 560;
export const SIDEBAR_DEFAULT_WIDTH = 240;
/** 主编辑区至少保留的宽度，避免侧边栏拖到占据整个窗口 */
const MAIN_MIN_WIDTH = 480;
/** 键盘微调步长（普通 / Shift） */
const KEY_STEP = 16;
const KEY_STEP_FAST = 48;

const WIDTH_KEY = "vesadocforge:sidebar-width";

function maxWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_MAX_WIDTH;
  return Math.max(
    SIDEBAR_MIN_WIDTH,
    Math.min(SIDEBAR_MAX_WIDTH, window.innerWidth - MAIN_MIN_WIDTH),
  );
}

function clampWidth(value: number): number {
  if (!Number.isFinite(value)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.round(Math.max(SIDEBAR_MIN_WIDTH, Math.min(value, maxWidth())));
}

function initialWidth(): number {
  const raw = Number(getPref(WIDTH_KEY));
  return Number.isFinite(raw) && raw > 0 ? clampWidth(raw) : SIDEBAR_DEFAULT_WIDTH;
}

export interface SidebarResize {
  /** 当前侧边栏宽度（px，已钳制） */
  width: number;
  /** 是否正在拖拽 */
  resizing: boolean;
  /** 拖拽起点（pointerdown 的 clientX） */
  beginResize: (clientX: number) => void;
  /** 拖拽中（pointermove 的 clientX） */
  moveResize: (clientX: number) => void;
  /** 结束拖拽并持久化 */
  endResize: () => void;
  /** 键盘微调；dx 为像素增量 */
  nudgeResize: (dx: number) => void;
  /** 恢复默认宽度 */
  resetResize: () => void;
}

export function useSidebarResize(): SidebarResize {
  const [width, setWidth] = useState<number>(initialWidth);
  const [resizing, setResizing] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;
  const startX = useRef(0);
  const startWidth = useRef(0);

  /* 视口变化时重新钳制，避免宽屏拖大后切到窄屏越界 */
  useEffect(() => {
    const onResize = () => setWidth((w) => clampWidth(w));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* 松手后落盘（拖拽期间不写，避免高频 localStorage 访问） */
  useEffect(() => {
    if (resizing) return;
    setPref(WIDTH_KEY, String(width));
  }, [width, resizing]);

  /* 拖拽期间锁定取词与文本选中，光标统一为 col-resize */
  useEffect(() => {
    if (!resizing) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [resizing]);

  const beginResize = useCallback((clientX: number) => {
    startX.current = clientX;
    startWidth.current = widthRef.current;
    setResizing(true);
  }, []);

  const moveResize = useCallback((clientX: number) => {
    setWidth(clampWidth(startWidth.current + (clientX - startX.current)));
  }, []);

  const endResize = useCallback(() => setResizing(false), []);

  const nudgeResize = useCallback((dx: number) => {
    setWidth((w) => clampWidth(w + dx));
  }, []);

  const resetResize = useCallback(
    () => setWidth(clampWidth(SIDEBAR_DEFAULT_WIDTH)),
    [],
  );

  return { width, resizing, beginResize, moveResize, endResize, nudgeResize, resetResize };
}

export { KEY_STEP, KEY_STEP_FAST };
