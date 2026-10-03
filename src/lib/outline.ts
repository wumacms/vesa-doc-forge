/**
 * Markdown 大纲提取：扫描 ATX 标题（# ~ ######），跳过围栏代码块。
 * line 为 1-based 行号，供编辑器 revealLine 与预览按序定位。
 */

export interface OutlineItem {
  /** 标题层级 1-6 */
  level: number;
  /** 清洗后的显示文本（去掉强调、链接等标记） */
  text: string;
  /** 所在行号（1-based） */
  line: number;
}

/** 去掉行内标记，只留可读文本 */
function cleanLabel(t: string): string {
  return t
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1") // 强调
    .replace(/`+/g, "") // 行内代码
    .replace(/\s+#+\s*$/, "") // ATX 结尾的 #
    .trim();
}

/** 判断某行是否可作为 setext 标题的文本行（普通段落行） */
function isSetextCandidate(s: string): boolean {
  if (!s) return false;
  return !/^(#{1,6}\s|>|[-*+]\s|\d+\.\s|\||```|~~~)/.test(s);
}

export function extractOutline(md: string): OutlineItem[] {
  const lines = md.split(/\r?\n/);
  const out: OutlineItem[] = [];
  let fenceChar: string | null = null;
  /** 上一非空行（trim 后），用于 setext 判定 */
  let prev = "";
  let prevLineNo = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // 围栏代码块开关：``` 或 ~~~（同种字符视为闭合）
    const fm = /^\s{0,3}(`{3,}|~{3,})/.exec(raw);
    if (fm) {
      const ch = fm[1][0];
      if (fenceChar === null) fenceChar = ch;
      else if (ch === fenceChar) fenceChar = null;
      prev = "";
      continue;
    }
    if (fenceChar !== null) {
      prev = "";
      continue;
    }

    const trimmed = raw.trim();

    // setext 标题：上一行是段落文本，本行是 === / ---
    const sm = /^(=+|-+)\s*$/.exec(trimmed);
    if (sm && prev && isSetextCandidate(prev)) {
      out.push({
        level: sm[1][0] === "=" ? 1 : 2,
        text: cleanLabel(prev) || "（无标题）",
        line: prevLineNo,
      });
      prev = "";
      continue;
    }

    const m = /^(#{1,6})(?:\s+(.*))?$/.exec(trimmed);
    if (m) {
      // "###abc"（# 后无空格且非纯 #）不是标题
      if (!(m[2] === undefined && trimmed.length > m[1].length)) {
        const text = cleanLabel(m[2] ?? "");
        out.push({ level: m[1].length, text: text || "（无标题）", line: i + 1 });
      }
      prev = "";
      continue;
    }

    if (trimmed) {
      prev = trimmed;
      prevLineNo = i + 1;
    } else {
      prev = "";
    }
  }
  return out;
}
