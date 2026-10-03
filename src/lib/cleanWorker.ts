/**
 * 创建 Web Worker 的安全工厂。
 *
 * 背景：部分自动化/隐私保护环境（浏览器扩展）会劫持页面主世界的
 * `Worker` 构造器，把传入的脚本 URL 包进一个调用 `importScripts()`
 * 的引导 blob。当目标 worker 以 `type: "module"` 创建时，浏览器会抛出
 * "Failed to execute 'importScripts' on 'WorkerGlobalScope':
 *  Module scripts don't support importScripts()."
 * 失败的 ErrorEvent 还会被 Monaco 的 onUnexpectedExternalError 在
 * setTimeout 中重新 throw，表现为 "Uncaught [object ErrorEvent]"。
 *
 * 对策：
 * 1. 优先从隐藏的同源 iframe realm 获取原生 Worker 构造器（主世界的
 *    代理可能伪装成 native code，不能只靠 toString 判断）。
 * 2. 给创建的 worker 附加最先注册的 error 监听：preventDefault +
 *    stopImmediatePropagation，阻止错误转发到 window 以及后续
 *    监听者（Monaco）的异步重抛。
 * 3. 安装全局（捕获阶段）error 监听，兜底抑制环境注入层噪声错误。
 *    消费方（Monaco / pdf.js）均有主线程回退，功能不受影响。
 */

let cachedCtor: typeof Worker | null = null;
let suppressorInstalled = false;

function isNativeCtor(fn: unknown): boolean {
  try {
    return /\{\s*\[native code\]\s*\}/.test(
      Function.prototype.toString.call(fn),
    );
  } catch {
    return false;
  }
}

/**
 * 获取（尽可能）未被劫持的 Worker 构造器。
 * 主世界构造器若本身是原生实现则优先使用——iframe realm 的
 * opaque origin 会让同源 worker 脚本被当作跨源请求（COOP 环境），
 * 触发 ERR_BLOCKED_BY_RESPONSE。仅当主世界疑似被代理劫持时，
 * 才尝试 iframe realm 的干净构造器。
 */
function getPristineWorkerCtor(): typeof Worker {
  if (cachedCtor) return cachedCtor;
  if (isNativeCtor(Worker)) {
    cachedCtor = Worker;
    return cachedCtor;
  }
  try {
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("title", "worker-bridge");
    // 保持 iframe 在文档中：移除创建方文档会导致其 worker 被终止
    document.body.appendChild(frame);
    const win = frame.contentWindow as
      | (Window & { Worker?: typeof Worker })
      | null;
    if (win && typeof win.Worker === "function" && isNativeCtor(win.Worker)) {
      cachedCtor = win.Worker;
      return cachedCtor;
    }
  } catch {
    // 无法取得干净构造器，回退主世界
  }
  return Worker;
}

function isWorkerLike(t: unknown): boolean {
  const o = t as Record<string, unknown> | null;
  return (
    !!o &&
    o !== (window as unknown) &&
    o !== (document as unknown) &&
    typeof o.postMessage === "function" &&
    typeof o.terminate === "function"
  );
}

/**
 * 抑制环境注入噪声错误的全局上报：
 * - error 事件目标是 worker 对象（注入层内部 worker 失败转发）；
 * - window.onerror 收到的是 Event/ErrorEvent 对象而非 Error 实例
 *   （即 "Uncaught [object ErrorEvent]" 的来源）；
 * - 扩展合成的转发事件：target 为 window、无 Error 对象、无源文件。
 * 真实未捕获 JS 异常与资源加载错误不在此列。
 */
function installWorkerErrorSuppressor(): void {
  if (suppressorInstalled) return;
  suppressorInstalled = true;
  window.addEventListener(
    "error",
    (e) => {
      const errLike = (e as unknown as { error?: unknown }).error;
      const isNoise =
        isWorkerLike(e.target) ||
        (errLike instanceof Event && !(errLike instanceof Error)) ||
        (e.target === window && !errLike && !e.filename);
      if (isNoise) {
        e.preventDefault();
        // eslint-disable-next-line no-console
        console.warn("[DocForge] 已忽略环境注入层的 worker 错误。");
      }
    },
    true,
  );
}

// 模块加载即安装全局抑制器：环境注入层可能在工厂被调用之前
// 就已经创建了失败的 worker。
if (typeof window !== "undefined") {
  installWorkerErrorSuppressor();
}

/**
 * 使用（尽可能）未被环境代理的 Worker 构造器创建 module worker。
 * 返回的 worker 脚本必须与页面同源，以保证跨 realm 构造可用。
 * 若构造同步失败（劫持层直接 throw），归一化为普通 Error 抛出，
 * 避免外来的 ErrorEvent 对象成为 window 上的 Uncaught 异常；
 * 调用方（Monaco / pdf.js）收到 throw 后会回退到主线程执行。
 */
export function createModuleWorker(scriptUrl: string): Worker {
  installWorkerErrorSuppressor();
  // iframe realm 中相对路径的 base 可能不同，统一解析为绝对 URL。
  const absoluteUrl = new URL(scriptUrl, window.location.href).href;
  const Ctor = getPristineWorkerCtor();
  let worker: Worker;
  try {
    worker = new Ctor(absoluteUrl, { type: "module" });
  } catch (e) {
    // 被劫持的构造器可能 throw 任意值（如 ErrorEvent），归一化为
    // 普通 Error（ES2020 目标下不支持 ErrorOptions，手动挂 cause）
    const normalized = new Error("worker unavailable");
    (normalized as Error & { cause?: unknown }).cause = e;
    throw normalized;
  }
  // 最先注册：preventDefault 阻止转发到 window，
  // stopImmediatePropagation 阻止 Monaco 稍后注册的 error 回调
  // （其内部会经 onUnexpectedExternalError 异步重抛 ErrorEvent）。
  worker.addEventListener(
    "error",
    (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.warn(
        "[DocForge] worker 启动失败，已回退到主线程执行：",
        e.message,
      );
    },
    false,
  );
  return worker;
}
