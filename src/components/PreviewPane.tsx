/**
 * 预览分发：按文件名从解析器注册表取出对应 DocParser 并渲染。
 * 未知/未注册类型会命中 text fallback，绝不白屏。
 */
import type { WsFile } from "@/types";
import { resolveParser } from "@/lib/parsers/registry";
import MarkdownPreview from "@/components/previews/MarkdownPreview";

export default function PreviewPane({ file }: { file: WsFile }) {
  try {
    const parser = resolveParser(file.name);
    return <parser.Preview file={file} />;
  } catch {
    // 兜底：注册表异常时退回 Markdown 渲染
    return <MarkdownPreview file={file} />;
  }
}
