/**
 * HTML 预览：srcdoc iframe，sandbox 不给 same-origin 权限，
 * 脚本在隔离环境运行，无法访问宿主页面数据。
 *
 * 关于"沙箱里主题切换/菜单按钮点了没反应"：
 * opaque origin（无 allow-same-origin）下，页面脚本一访问 localStorage /
 * sessionStorage / indexedDB 就会抛 SecurityError，常见于主题切换（读写
 * localStorage）和移动菜单（依赖存储的记忆状态），脚本当场中断，后续
 * 事件绑定全部失效。这里向沙箱注入内存版 Storage 垫片，让这类页面在
 * 预览里能正常交互；数据仅存活于当前 iframe 实例，刷新即清空，不会
 * 接触宿主站的真实存储。
 */
import { useEffect, useMemo, useState } from "react";
import { RotateCw, ShieldAlert } from "lucide-react";
import type { PreviewProps } from "@/types";

/** 内存版 Storage：API 与 localStorage 一致，按 origin 不透明、随 iframe 销毁 */
const STORAGE_SHIM = `<script>(function(){
function makeStorage(){var m=Object.create(null);var s={
getItem:function(k){k=String(k);return k in m?m[k]:null;},
setItem:function(k,v){m[String(k)]=String(v);},
removeItem:function(k){delete m[String(k)];},
clear:function(){for(var k in m)delete m[k];},
key:function(i){var ks=Object.keys(m);return i<ks.length?ks[i]:null;},
get length(){return Object.keys(m).length;}};
Object.defineProperty(s,'_items',{value:m});return s;}
try{
if(!(function(){try{return !!localStorage;}catch(e){return false;}})()){
var ls=makeStorage();
Object.defineProperty(window,'localStorage',{value:ls,configurable:true});
var ss=makeStorage();
Object.defineProperty(window,'sessionStorage',{value:ss,configurable:true});
}
}catch(e){}
})();</script>`;

/** 把垫片插到文档最前面，保证晚于它的页面脚本先拿到 Storage */
function injectShim(html: string): string {
  const at = html.search(/<head(\s[^>]*)?>/i);
  if (at !== -1) {
    const insert = html.indexOf(">", at) + 1;
    return html.slice(0, insert) + STORAGE_SHIM + html.slice(insert);
  }
  const body = html.search(/<body(\s[^>]*)?>/i);
  if (body !== -1) {
    const insert = html.indexOf(">", body) + 1;
    return html.slice(0, insert) + STORAGE_SHIM + html.slice(insert);
  }
  return STORAGE_SHIM + html;
}

export default function HtmlPreview({ file }: PreviewProps) {
  const [nonce, setNonce] = useState(0);
  const srcDoc = useMemo(() => injectShim(file.content), [file.content]);

  /* 切换文件时重置手动重渲染计数，避免复用旧 iframe 状态 */
  useEffect(() => setNonce(0), [file.id]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-1.5">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          沙箱渲染：脚本在隔离 iframe 中执行，存储写入为内存模拟，不影响本页
        </p>
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => setNonce((n) => n + 1)}
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          重新渲染
        </button>
      </div>
      <iframe
        key={`${file.id}:${nonce}`}
        title={`HTML 预览：${file.name}`}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        className="min-h-0 flex-1 border-0 bg-white"
      />
    </div>
  );
}
