import type { DocParser } from "@/types";
import { extOf } from "@/types";

/**
 * 解析器注册表：按注册顺序匹配，第一个 test 命中的 parser 生效。
 * resolveParser 永不返回 undefined —— 最后必须注册一个 fallback。
 */
const registry: DocParser[] = [];

export function registerParser(parser: DocParser): void {
  registry.push(parser);
}

export function allParsers(): readonly DocParser[] {
  return registry;
}

export function resolveParser(fileName: string): DocParser {
  const ext = extOf(fileName);
  for (const p of registry) {
    if (p.test(ext, fileName)) return p;
  }
  // 理论上不会到达（text parser 恒真），兜底抛出便于调试注册遗漏
  throw new Error(`没有匹配的解析器：${fileName}（请检查 parser 注册）`);
}
