#!/usr/bin/env node
/**
 * 主题制作辅助工具（非运行时依赖）：
 * 从 stdin 逐行读取 Hex 颜色，输出与浏览器渲染一致的 oklch() 字符串。
 * 数学实现与 src/lib/theme/colorMath.ts 完全相同（内联副本，避免 ts 加载）。
 *
 * 用法：node scripts/tools/hex2oklch.cjs < colors.txt
 */

const gammaDecode = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

function hexToOklch(hex) {
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  const r = gammaDecode(parseInt(h.slice(1, 3), 16) / 255);
  const g = gammaDecode(parseInt(h.slice(3, 5), 16) / 255);
  const b = gammaDecode(parseInt(h.slice(5, 7), 16) / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675718 * s_;

  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  const fmt = (v, d) => {
    const s = v.toFixed(d);
    return s.replace(/\.?0+$/, (mm) => (mm.includes(".") ? mm : ""));
  };
  return C < 1e-4 ? `oklch(${fmt(L, 4)} 0 ${fmt(H, 4)})` : `oklch(${fmt(L, 4)} ${fmt(C, 4)} ${fmt(H, 4)})`;
}

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  for (const line of input.split("\n")) {
    const l = line.trim();
    if (!l || l.startsWith("//")) continue;
    console.log(`${l}  =>  ${hexToOklch(l)}`);
  }
});
