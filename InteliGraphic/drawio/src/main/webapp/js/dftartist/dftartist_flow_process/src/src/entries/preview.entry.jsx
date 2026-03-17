// src/entries/preview.entry.jsx
import React, { useEffect, useState ,useRef} from 'react';
import { createRoot } from 'react-dom/client';
// Prism（打包进 IIFE）
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/themes/prism.css';

const POLL_MS = 1500;
const MIN_W = 350;
const MAX_W = 1600;
const DEFAULT_WIDTH_PCT = 0.25;
const RIGHT_MARGIN = 5;
const BOTTOM_MARGIN = 34;
const TOP_MARGIN_FALLBACK = 60;
const WINDOW_Z_INDEX = 2000;

const KEY_W = 'DFT_PREVIEW_DOCK_W';
const KEY_BOUNDS = 'DFT_PREVIEW_LAST_BOUNDS';

// ---------- 工具 ----------
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
function getTopOffset() {
  const ui = window.DFT_CTX;
  const mb = ui?.menubarContainer?.offsetHeight || 0;
  const tb = ui?.toolbarContainer?.offsetHeight || 0;
  const extra = 5; //顶部 margin
  return (mb + tb + extra) || TOP_MARGIN_FALLBACK;
}
function getViewport() {
  const vw = document.documentElement.clientWidth || window.innerWidth || 1280;
  const vh = window.innerHeight || document.documentElement.clientHeight || 800;
  return { vw, vh };
}
function getSavedWidth() {
  try { const raw = localStorage.getItem(KEY_W); return raw ? clamp(+raw||720, MIN_W, MAX_W) : null; }
  catch { return null; }
}
function saveWidth(w) {
  const v = clamp(Math.round(w), MIN_W, MAX_W);
  try { localStorage.setItem(KEY_W, String(v)); } catch {}
  return v;
}
function getWndMetrics(wnd) {
  const div = wnd && wnd.div;
  const w = div?.offsetWidth ?? 0;
  const h = div?.offsetHeight ?? 0;
  const x = (typeof wnd?.getX === 'function') ? wnd.getX() : parseInt(div?.style.left || '0', 10);
  const y = (typeof wnd?.getY === 'function') ? wnd.getY() : parseInt(div?.style.top  || '0', 10);
  return { w, h, x, y };
}
function saveBounds(wnd) {
  try {
    const m = getWndMetrics(wnd);
    const b = { x: m.x, y: m.y, w: m.w, h: m.h };
    localStorage.setItem(KEY_BOUNDS, JSON.stringify(b));
  } catch {}
}
function getLastBounds() {
  try { return JSON.parse(localStorage.getItem(KEY_BOUNDS) || 'null'); }
  catch { return null; }
}
// 位置夹紧：将 (x,y,w,h) 限制在视口内（顶部留出工具栏高度）
function clampToViewport(x, y, w, h) {
  const { vw, vh } = getViewport();
  const topMin = getTopOffset();
  const maxX = Math.max(0, vw - w - RIGHT_MARGIN);
  const maxY = Math.max(topMin, vh - h - BOTTOM_MARGIN);
  return { x: clamp(x, 0, maxX), y: clamp(y, topMin, maxY) };
}

// 实时 XML
function getLiveXml(ui) {
  try {
    const inner = mxUtils.getXml(ui.editor.getGraphXml());
    return `<mxfile><diagram>${inner}</diagram></mxfile>`;
  } catch {
    return (ui.getFileData ? ui.getFileData(true) : ui.editor.getFileData(true)) || '';
  }
}

// 提示 & IO
function toast(msg) {
  if (window.DFT_CTX?.showTemporaryMessage) return window.DFT_CTX.showTemporaryMessage(msg);
  const tip = document.createElement('div');
  tip.textContent = msg;
  tip.style.cssText =
    'position:fixed;left:50%;top:20px;transform:translateX(-50%);' +
    'background:rgba(0,0,0,.8);color:#fff;padding:6px 10px;border-radius:4px;' +
    'font:12px sans-serif;z-index:99999';
  document.body.appendChild(tip); setTimeout(() => tip.remove(), 1200);
}
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text||'');
    else { const ta=document.createElement('textarea'); ta.value=text||''; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast('已复制到剪贴板');
  } catch(e){ alert('复制失败：'+e); }
}
function exportText(text, filename='diagram.dftspec') {
  const ui = window.DFT_CTX;
  if (ui?.saveData) {
    const b64 = btoa(unescape(encodeURIComponent(text||'')));
    ui.saveData(filename, 'txt', b64, 'text/plain', true);
  } else {
    const blob = new Blob([text||''], {type:'text/plain;charset=utf-8'});
    const a = document.createElement('a'); a.download=filename; a.href=URL.createObjectURL(blob);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),800);
  }
}

// ---------- 转换：XML → YAML → DFTSPEC ----------
function xmlToDftspec(xml){
  if (typeof convertXmlToyaml !== 'function')
    return '# 缺少 convertXmlToyaml(xml, includeAttrs) 函数';
  if (typeof convertYamlToDftspec !== 'function')
    return '# 缺少 convertYamlToDftspec(yaml) 函数';

  const y = convertXmlToyaml(xml, true);
  if (y && typeof y.then === 'function') {
    return y.then(yaml => {
      const r = convertYamlToDftspec(yaml);
      return (r && typeof r.then === 'function') ? r : r;
    });
  } else {
    const r = convertYamlToDftspec(y);
    return (r && typeof r.then === 'function') ? r : r;
  }
}

// ---------- React 面板 ----------
function CodePanel() {
  const ui = window.DFT_CTX;
  const [text, setText] = useState('# 加载中…');
  const [loading, setLoading] = useState(false);
  const codeRef = useRef(null);

  useEffect(()=>{ if(codeRef.current) Prism.highlightElement(codeRef.current); }, [text]);

  useEffect(()=>{
    if (!ui) return;
    let alive = true;
    const refresh = () => {
      if (!alive) return;
      try {
        setLoading(true);
        const xml = getLiveXml(ui);
        const out = xmlToDftspec(xml);
        const done = (s)=>{ if(alive){ setText(s||''); setLoading(false);} };
        if (out && typeof out.then === 'function') out.then(done).catch(e=>done('# 生成失败：'+(e?.message||e)));
        else done(out);
      } catch(e){ setText('# 生成失败：'+(e?.message||e)); setLoading(false); }
    };

    refresh();
    const graph = ui.editor.graph, model=graph.getModel(), um=ui.editor.undoManager;
    const kick = ()=>refresh();
    model.addListener(mxEvent.CHANGE, kick);
    model.addListener(mxEvent.ROOT,   kick);
    um.addListener(mxEvent.ADD,       kick);
    um.addListener(mxEvent.UNDO,      kick);
    um.addListener(mxEvent.REDO,      kick);
    graph.getSelectionModel().addListener(mxEvent.CHANGE, kick);
    try { ui.editor.addListener && ui.editor.addListener('pageSelected', kick); } catch {}

    const t = setInterval(kick, POLL_MS);
    return ()=>{ clearInterval(t); alive=false; };
  }, [ui]);

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
      <div style={{display:'flex', gap:8, alignItems:'center', padding:'6px 8px', borderBottom:'1px solid #e8e8e8', background:'#f5f7f9'}}>
        <strong>DFT SPEC 预览</strong>
        <span style={{color:'#999', marginLeft:6}}>{loading ? '（更新中…）' : ''}</span>
        <div style={{flex:1}} />
        <button onClick={()=>copyText(text)} disabled={!text || text.startsWith('# 缺少')}>复制</button>
        <button onClick={()=>exportText(text)} disabled={!text || text.startsWith('# 缺少')}>导出</button>
        <button onClick={()=>{
          const xml = getLiveXml(window.DFT_CTX);
          const out = xmlToDftspec(xml);
          if (out && typeof out.then === 'function') out.then(s=>setText(s||'')).catch(e=>setText('# 生成失败：'+(e?.message||e)));
          else setText(out || '');
        }}>刷新</button>
      </div>
      <div style={{flex:'1 1 auto', overflow:'auto', padding:'12px 16px'}}>
        <pre style={{margin:0}}>
          {/* DFTSPEC 用 yaml 高亮；如需纯文本，用 language-none */}
          <code ref={codeRef} className="language-yaml">{text || ''}</code>
        </pre>
      </div>
    </div>
  );
}

// ---------- mxWindow：贴边/边界限制 ----------
let _wnd=null, _root=null, _host=null;
let _didInitialDock=false;
let _userInteracted=false;

function initialDock() {
  if (!_wnd) return;
  const { vw, vh } = getViewport();
  const top = getTopOffset();
  const saved = getSavedWidth();
  const defaultW = clamp(Math.round(vw * DEFAULT_WIDTH_PCT), MIN_W, MAX_W);
  const w = saved ?? defaultW;
  const h = Math.max(180, vh - top - BOTTOM_MARGIN);
  const x = Math.max(0, vw - w - RIGHT_MARGIN);
  const y = top;
  _wnd.__origSetLocation(x, y);
  _wnd.setSize(w, h);
}

// 对 setLocation 做“夹紧”，保证不能离开软件窗口
function wrapSetLocationClamp(wnd){
  if (wnd.__origSetLocation) return; // 只包一次
  wnd.__origSetLocation = wnd.setLocation.bind(wnd);
  wnd.setLocation = (x, y) => {
    const m = getWndMetrics(wnd);
    const p = clampToViewport(x, y, m.w, m.h);
    wnd.__origSetLocation(p.x, p.y);
  };
}

function ensureWindow(){
  if (_wnd) return;

  _host = document.createElement('div');
  _host.style.cssText = 'width:100%;height:100%;position:relative;';

  const last = getLastBounds();
  const initW = last?.w || (getSavedWidth() ?? 720);
  const initH = last?.h || 360;
  const initX = last?.x ?? 100;
  const initY = last?.y ?? 80;

  _wnd = new mxWindow('DFT SPEC 预览', _host, initX, initY, initW, initH, true, true);
  _wnd.minimumSize = new mxRectangle(0, 0, MIN_W, 180);
  _wnd.setVisible(false);
  _wnd.destroyOnClose = false;           // 点 X 只隐藏，不销毁
  _wnd.setResizable && _wnd.setResizable(true);
  _wnd.setClosable && _wnd.setClosable(true);   // 显示 X
  _wnd.setMinimizable && _wnd.setMinimizable(true); // 显示 ⇧/折叠

  // 监听 close：统一改为隐藏
  const onClose = () => { try{ _wnd.setVisible(false); }catch{} };
  try { _wnd.addListener(mxEvent.CLOSE, onClose); } catch {}
  try { _wnd.addListener && _wnd.addListener('close', onClose); } catch {}

  // 位置夹紧
  wrapSetLocationClamp(_wnd);

  if (_wnd.div) {
    _wnd.div.style.zIndex = String(WINDOW_Z_INDEX);
  }

  // React
  _root = createRoot(_host);
  _root.render(React.createElement(CodePanel));

  // 移动时保存
  try { _wnd.addListener(mxEvent.MOVE, ()=>{ _userInteracted=true; saveBounds(_wnd); }); } catch {}

  // ==== 自定义 8 个握把（保持不越界）====
  const container = _wnd.div;
  container.style.position = container.style.position || 'absolute';

  function makeGripToDiv({css, cursor, calc}) {
    const g = document.createElement('div');
    g.style.cssText = css + ';position:absolute;z-index:1000;background:transparent;pointer-events:auto;';
    g.style.cursor = cursor;
    container.appendChild(g);

    let dragging=false;
    let st={ x:0, y:0, w:0, h:0, winX:0, winY:0 };

    const cancelDrag = ()=>{
      if (!dragging) return;
      try {
        const m = getWndMetrics(_wnd);
        saveWidth(m.w); saveBounds(_wnd); _userInteracted = true;
      } finally {
        dragging = false;
        document.body.style.userSelect = '';
      }
    };

    g.addEventListener('mousedown', (e)=>{
      e.preventDefault(); e.stopPropagation();
      dragging=true;
      const m = getWndMetrics(_wnd);
      st = { x:e.clientX, y:e.clientY, w:m.w, h:m.h, winX:m.x, winY:m.y };
      document.body.style.userSelect = 'none';
    }, { passive:false });

    window.addEventListener('mousemove', (e)=>{
      if (!dragging) return;
      try {
        let { w, h, x, y } = calc({ st, ex:e.clientX, ey:e.clientY });

        // 尺寸先夹紧在视口允许范围内
        const { vw, vh } = getViewport();
        const topMin = getTopOffset();
        const maxW = Math.min(MAX_W, vw - RIGHT_MARGIN);
        const maxH = Math.max(180, vh - topMin - BOTTOM_MARGIN);
        w = clamp(w, MIN_W, maxW);
        h = clamp(h, 180,  maxH);

        // 位置夹紧
        ({ x, y } = clampToViewport(x, y, w, h));

        _wnd.setSize(w, h);
        _wnd.__origSetLocation(x, y); // 已经夹紧，直接原始设置
      } catch {
        cancelDrag();
      }
    });

    window.addEventListener('mouseup', cancelDrag);
    window.addEventListener('blur',   cancelDrag);
  }

  // 边（厚 8px）
  makeGripToDiv({
    css:'top:0;right:0;width:8px;height:100%', cursor:'ew-resize',
    calc: ({st, ex}) => ({ w: st.w + (ex - st.x), h: st.h, x: st.winX, y: st.winY })
  });
  makeGripToDiv({
    css:'top:0;left:0;width:8px;height:100%', cursor:'ew-resize',
    calc: ({st, ex}) => {
      const dw = ex - st.x; const newW = st.w - dw; const newX = st.winX + dw;
      return { w:newW, h:st.h, x:newX, y:st.winY };
    }
  });
  makeGripToDiv({
    css:'left:0;right:0;bottom:0;height:8px', cursor:'ns-resize',
    calc: ({st, ey}) => ({ w: st.w, h: st.h + (ey - st.y), x: st.winX, y: st.winY })
  });
  makeGripToDiv({
    css:'left:0;right:0;top:0;height:8px', cursor:'ns-resize',
    calc: ({st, ey}) => {
      const dh = ey - st.y; const newH = st.h - dh; const newY = st.winY + dh;
      return { w:st.w, h:newH, x:st.winX, y:newY };
    }
  });

  // 角（12×12）
  makeGripToDiv({
    css:'right:0;bottom:0;width:12px;height:12px', cursor:'se-resize',
    calc: ({st, ex, ey}) => ({ w: st.w + (ex - st.x), h: st.h + (ey - st.y), x: st.winX, y: st.winY })
  });
  makeGripToDiv({
    css:'left:0;bottom:0;width:12px;height:12px', cursor:'sw-resize',
    calc: ({st, ex, ey}) => {
      const dw = ex - st.x, dh = ey - st.y;
      const newW = st.w - dw, newX = st.winX + dw;
      return { w:newW, h:st.h + dh, x:newX, y:st.winY };
    }
  });
  makeGripToDiv({
    css:'right:0;top:0;width:12px;height:12px', cursor:'ne-resize',
    calc: ({st, ex, ey}) => {
      const dw = ex - st.x, dh = ey - st.y;
      const newH = st.h - dh, newY = st.winY + dh;
      return { w:st.w + dw, h:newH, x:st.winX, y:newY };
    }
  });
  makeGripToDiv({
    css:'left:0;top:0;width:12px;height:12px', cursor:'nw-resize',
    calc: ({st, ex, ey}) => {
      const dw = ex - st.x, dh = ey - st.y;
      const newW = st.w - dw, newX = st.winX + dw;
      const newH = st.h - dh, newY = st.winY + dh;
      return { w:newW, h:newH, x:newX, y:newY };
    }
  });
}

const API = {
  isVisible(){
    return !!(_wnd && _wnd.div && _wnd.div.style.display !== 'none');
  },

  open() {
    ensureWindow();

    // 新增：已可见则当成“第二次点击”，直接关闭
    if (this.isVisible()) {
      this.close();
      return;
    }

    // 首次：右侧贴边 + 满高（保持你原有逻辑）
    if (!_didInitialDock) {
      initialDock();
      _didInitialDock = true;

      // 用户未交互前，若窗口尺寸变化，跟随一次
      const follow = () => { if (!_userInteracted) initialDock(); };
      window.addEventListener('resize', follow);
      const t = setInterval(()=>{ if (_userInteracted){ window.removeEventListener('resize', follow); clearInterval(t);} }, 300);
    }

    _wnd.setVisible(true);
    if (_wnd.div) _wnd.div.style.zIndex = String(WINDOW_Z_INDEX);
    _wnd.activate && _wnd.activate();
    if (_wnd.div) _wnd.div.style.zIndex = String(WINDOW_Z_INDEX);
  },

  close(){
    if (_wnd) _wnd.setVisible(false);
  },

  toggle(){
    if (!(_wnd && _wnd.div)) { this.open(); return; }
    return this.isVisible() ? this.close() : this.open();
  },

  destroy(){
    if (_root){ _root.unmount(); _root=null; }
    if (_wnd){ try{ _wnd.destroy(); }catch{} _wnd=null; }
    if (_host){ _host.remove(); _host=null; }
  }
};

window.DFTPreviewCode = API;
export default API;
