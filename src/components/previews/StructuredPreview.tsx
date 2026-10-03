/**
 * 结构化数据预览（JSON / YAML 共用）：
 * parse 成功 → 可折叠数据树；失败 → 错误信息 + 原文。
 */
import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { PreviewProps } from "@/types";

type ParseResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

function primitiveText(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  return String(v);
}

function Node({ label, value, depth }: { label: ReactNode; value: unknown; depth: number }) {
  const isObject =
    value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);

  if (!isObject && !isArray) {
    const type = value === null ? "null" : typeof value;
    return (
      <div
        className="flex flex-wrap items-baseline gap-x-2 py-0.5"
        style={{ paddingLeft: depth * 16 }}
      >
        <span className="font-mono text-[13px] font-semibold text-accent-foreground">
          {label}
        </span>
        <span className="text-muted-foreground" aria-hidden>
          :
        </span>
        <span
          className={
            type === "string"
              ? "font-mono text-[13px] text-[var(--hljs-string)]"
              : type === "number" || type === "boolean"
                ? "font-mono text-[13px] text-[var(--hljs-number)]"
                : "font-mono text-[13px] italic text-muted-foreground"
          }
        >
          {type === "string" ? JSON.stringify(String(value)) : primitiveText(value)}
        </span>
      </div>
    );
  }

  const entries: [ReactNode, unknown][] = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);

  return (
    <details open={depth < 2} style={{ paddingLeft: depth * 16 }}>
      <summary className="cursor-pointer select-none py-0.5 font-mono text-[13px]">
        <span className="font-semibold text-accent-foreground">{label}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </summary>
      {entries.length === 0 && (
        <div className="py-0.5 pl-4 text-xs italic text-muted-foreground">
          （空）
        </div>
      )}
      {entries.map(([k, v], i) => (
        <Node key={`${String(k)}-${i}`} label={k} value={v} depth={depth + 1} />
      ))}
    </details>
  );
}

export function StructuredPreview({
  file,
  format,
  parse,
}: PreviewProps & {
  format: string;
  parse: (text: string) => unknown;
}) {
  const [showRaw, setShowRaw] = useState(false);

  const result = useMemo<ParseResult>(() => {
    const text = file.content.trim();
    if (!text) return { ok: true, data: null };
    try {
      return { ok: true, data: parse(text) };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [file.content, parse]);

  // tsconfig strict:false 下布尔判别属性不参与收窄，显式断言错误分支
  if (!result.ok) {
    const message = (result as { ok: false; error: string }).error;
    return (
      <div className="space-y-3 px-8 py-6">
        <div className="flex items-start gap-2  border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{format} 解析失败</p>
            <p className="mt-1 whitespace-pre-wrap font-mono text-xs">
              {message}
            </p>
          </div>
        </div>
        <pre className="overflow-x-auto  bg-secondary/60 p-3 font-mono text-xs leading-relaxed text-secondary-foreground">
          {file.content}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-8 py-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {format} · 数据树
        </span>
        <button
          type="button"
          onClick={() => setShowRaw((s) => !s)}
          className=" border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {showRaw ? "查看数据树" : "查看原文"}
        </button>
      </div>
      {showRaw ? (
        <pre className="overflow-x-auto  bg-secondary/60 p-3 font-mono text-xs leading-relaxed text-secondary-foreground">
          {file.content}
        </pre>
      ) : (
        <div className=" border border-border bg-card/50 p-3">
          <Node label="root" value={result.data} depth={0} />
        </div>
      )}
    </div>
  );
}
