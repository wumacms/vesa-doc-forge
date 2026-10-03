/**
 * 纯数学色彩空间转换（无外部依赖、无 Canvas）：
 * - oklchToHex：Ottosson Oklab → Linear sRGB → Gamma sRGB，基于规范 §5.1
 * - hexToOklch：同一变换的精确逆运算，用于主题制作时由品牌 Hex 反推 oklch，
 *   保证与浏览器/Tailwind v4 的 oklch 渲染语义一致，且与本模块运行时转换完全互逆。
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 解析 oklch("oklch(0.6723 0.1606 244.99)") / "oklch(0.5 0.1 200 / 0.5)" 为 [L,C,H,A] */
function parseOklch(input: string): [number, number, number, number] | null {
  const m = input.match(
    /oklch\(\s*([\d.]+)(?:%)?\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+)(?:%)?)?\s*\)/i,
  );
  if (!m) return null;
  return [
    parseFloat(m[1]),
    parseFloat(m[2]),
    parseFloat(m[3]),
    m[4] !== undefined ? parseFloat(m[4]) : 1,
  ];
}

function oklchToLinearRgb(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const gammaEncode = (val: number) => {
  const c = clamp01(val);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
};

const gammaDecode = (val: number) =>
  val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);

function toHex2(v: number): string {
  return Math.round(clamp01(v) * 255)
    .toString(16)
    .padStart(2, "0");
}

/**
 * 将 CSS 颜色字符串（oklch / hex）转为 Monaco 可用的 7 位 Hex。
 * 解析失败时返回中性灰兜底，绝不返回纯黑（避免"黑底黑字"事故）。
 */
export function oklchToHex(oklchStr: string): string {
  const raw = oklchStr.trim();
  if (!raw) return "#888888";
  if (raw.startsWith("#")) return normalizeHex(raw);

  const parsed = parseOklch(raw);
  if (!parsed) return "#888888";
  const [L, C, H] = parsed;
  const [r, g, b] = oklchToLinearRgb(L, C, H);
  return `#${toHex2(gammaEncode(r))}${toHex2(gammaEncode(g))}${toHex2(gammaEncode(b))}`;
}

/** 将 oklch 转为 rgba(r,g,b,a)（0~255 整数 + 0~1 alpha），Monaco 透明度色适用 */
export function oklchToRgba(oklchStr: string): string {
  const raw = oklchStr.trim();
  if (raw.startsWith("#")) {
    const hex = normalizeHex(raw);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 1)`;
  }
  const parsed = parseOklch(raw);
  if (!parsed) return "rgba(136, 136, 136, 1)";
  const [L, C, H, A] = parsed;
  const [r, g, b] = oklchToLinearRgb(L, C, H);
  return `rgba(${Math.round(clamp01(gammaEncode(r)) * 255)}, ${Math.round(
    clamp01(gammaEncode(g)) * 255,
  )}, ${Math.round(clamp01(gammaEncode(b)) * 255)}, ${clamp01(A)})`;
}

function normalizeHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.slice(0, 7);
}

/**
 * Hex → "oklch(L C H)"（精确逆变换，含色域裁剪回退）。
 * 仅用于主题制作工具链（scripts/tools/hex2oklch.cjs），运行时不打包。
 */
export function hexToOklch(hex: string): string {
  const h = normalizeHex(hex.startsWith("#") ? hex : `#${hex}`);
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

  const fmt = (v: number, digits: number) =>
    v.toFixed(digits).replace(/\.?0+$/, (s) => (s.includes(".") ? s : ""));
  return C < 1e-4
    ? `oklch(${fmt(L, 4)} 0 ${fmt(H, 4)})`
    : `oklch(${fmt(L, 4)} ${fmt(C, 4)} ${fmt(H, 4)})`;
}
