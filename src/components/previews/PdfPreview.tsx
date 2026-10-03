import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileWarning } from "lucide-react";
import type { PreviewProps } from "@/types";
import { createModuleWorker } from "@/lib/cleanWorker";

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export default function PdfPreview({ file }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<{ numPages: number; getPage: (n: number) => Promise<any> } | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(1.2);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let worker: Worker | null = null;
    setStatus("loading");
    setPage(1);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        // pdf.js 4.x 的 worker 是 ESM，必须以 module 类型创建；
        // 若环境劫持导致 worker 不可用，则不设置 workerPort，
        // pdf.js 会自动回退到主线程 fake worker。
        try {
          worker = createModuleWorker(workerUrl);
          pdfjs.GlobalWorkerOptions.workerPort = worker;
        } catch {
          worker = null;
        }
        const data = b64ToBytes(file.content.trim());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        docRef.current = doc;
        setPages(doc.numPages);
        setStatus("ready");
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      docRef.current = null;
      worker?.terminate();
      import("pdfjs-dist").then((pdfjs) => {
        if (pdfjs.GlobalWorkerOptions.workerPort === worker) {
          pdfjs.GlobalWorkerOptions.workerPort = null;
        }
      });
    };
  }, [file.content]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = docRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas || status !== "ready") return;
      try {
        const p = await doc.getPage(page);
        if (cancelled) return;
        const dpr = window.devicePixelRatio || 1;
        const base = p.getViewport({ scale: 1 });
        const viewport = p.getViewport({ scale: zoom * dpr });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;
        const renderTask = p.render({
          canvasContext: ctx,
          viewport,
        } as Parameters<typeof p.render>[0]);
        await renderTask.promise;
      } catch (e) {
        // 切换页面时取消旧渲染属于正常流程
        if (!String(e).includes("cancel")) console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, zoom, status]);

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileWarning className="h-10 w-10 text-destructive" aria-hidden />
        <p>PDF 解析失败，请检查文件内容是否为合法的 base64 PDF。</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-2 border-b border-border bg-card/60 px-4 py-2">
        <button
          type="button"
          aria-label="上一页"
          disabled={page <= 1}
          className=" p-2 hover:bg-accent disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-24 text-center text-sm tabular-nums">
          {status === "loading" ? "加载中…" : `${page} / ${pages}`}
        </span>
        <button
          type="button"
          aria-label="下一页"
          disabled={page >= pages}
          className=" p-2 hover:bg-accent disabled:opacity-40"
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="mx-2 h-5 w-px bg-border" aria-hidden />
        <button
          type="button"
          aria-label="缩小"
          className=" p-2 hover:bg-accent"
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-14 text-center text-sm tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="放大"
          className=" p-2 hover:bg-accent"
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/40 p-6">
        <canvas
          ref={canvasRef}
          className=" bg-white shadow-md"
          aria-label={`PDF 第 ${page} 页`}
        />
      </div>
    </div>
  );
}
