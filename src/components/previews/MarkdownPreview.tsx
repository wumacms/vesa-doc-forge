import { useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import hljs from "@/lib/highlight";
import { useMermaidTheme } from "@/lib/theme/mermaidTheme";
import CodeBlockChrome from "@/components/CodeBlockChrome";
import "katex/dist/katex.min.css";
import "@/styles/hljs.css";
import type { PreviewProps } from "@/types";

let mermaidSeq = 0;

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  // 感知 --mermaid-theme（风格 × 明暗级联结果），变化时自动重渲染
  const mermaidTheme = useMermaidTheme();

  useEffect(() => {
    let cancelled = false;
    const diagId = `my-d${mermaidSeq}`;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: mermaidTheme,
          fontFamily: "Open Sans, sans-serif",
        });
        const id = `mermaid-${++mermaidSeq}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      // mermaid 渲染失败时可能残留诊断节点
      document.getElementById(diagId)?.remove();
    };
  }, [code, mermaidTheme]);

  if (error) {
    return (
      <pre className="my-4 overflow-x-auto  border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        Mermaid 渲染失败：{error}
      </pre>
    );
  }
  return <div ref={ref} className="my-4 flex justify-center overflow-x-auto" />;
}

function CodeBlock({ className, children }: { className?: string; children?: ReactNode }) {
  const match = /language-(\w+)/.exec(className ?? "");
  const lang = match?.[1];
  const code = String(children ?? "").replace(/\n$/, "");
  if (lang === "mermaid") return <MermaidBlock code={code} />;
  let html: string | null = null;
  // 自动检测出的语言（无 fence info 时作为标题栏标签）
  let detected: string | undefined;
  try {
    if (lang && hljs.getLanguage(lang)) {
      html = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } else {
      const auto = hljs.highlightAuto(code);
      html = auto.value;
      detected = auto.language;
    }
  } catch {
    html = null;
  }
  return (
    <CodeBlockChrome lang={lang ?? detected} code={code} fenceLang={lang}>
      <pre className="hljs">
        {html === null ? (
          <code>{code}</code>
        ) : (
          <code dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </pre>
    </CodeBlockChrome>
  );
}

export default function MarkdownPreview({ file }: PreviewProps) {
  /* 每次渲染重置的标题计数器：渲染顺序即文档顺序，
     与 extractOutline 的条目一一对应（id = oc-0, oc-1...），
     供大纲点击后 scrollIntoView 定位。 */
  const headingSeq = { n: 0 };
  const headingId = () => `oc-${headingSeq.n++}`;

  return (
    <div className="mx-auto space-y-3 px-8 py-6 text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        components={{
          h1: ({ children }) => (
            <h1 id={headingId()} className="mt-6 border-b border-border pb-2 font-serif text-3xl font-semibold">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 id={headingId()} className="mt-8 font-serif text-2xl font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 id={headingId()} className="mt-6 text-lg font-semibold">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 id={headingId()} className="mt-4 text-base font-semibold">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 id={headingId()} className="mt-4 text-sm font-semibold">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 id={headingId()} className="mt-4 text-sm font-semibold text-muted-foreground">{children}</h6>
          ),
          p: ({ children }) => <p className="my-3">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-primary/40 bg-accent/40 py-2 pl-4 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          code(props) {
            const { className, children, ...rest } = props as {
              className?: string;
              children?: ReactNode;
            } & Record<string, unknown>;
            const isBlock =
              typeof className === "string" || String(children ?? "").includes("\n");
            if (isBlock) {
              return <CodeBlock className={className}>{children}</CodeBlock>;
            }
            return (
              <code
                className="  bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
                {...rest}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary underline underline-offset-2"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-border bg-card px-3 py-2 text-left font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="border border-border px-3 py-2">{children}</td>;
          },
          hr: () => <hr className="my-6 border-border" />,
        }}
      >
        {file.content}
      </ReactMarkdown>
    </div>
  );
}
