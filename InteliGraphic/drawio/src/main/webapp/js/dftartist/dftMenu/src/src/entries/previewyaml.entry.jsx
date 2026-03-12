// src/entries/preview.entry.jsx
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

// Prism（打包到 IIFE 内）
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/themes/prism.css';

const POLL_MS = 1500;
const MIN_W = 320;
const MAX_W = 1400;
const RIGHT_MARGIN = 12;
const TOP_MARGIN_FALLBACK = 60;

const KEY_W = 'DFT_PREVIEW_DOCK_W';
const KEY_BOUNDS = 'DFT_PREVIEW_LAST_BOUNDS';

// —— 工具函数 ——
function getTopOffset() {
  const ui = window.DFT_CTX;
  const mb = ui?.menubarContainer?.offsetHeight || 0;
  const tb = ui?.toolbarContainer?.offsetHeight || 0;
  const extra = 8;
  const sum = mb + tb + extra;
  return sum || TOP_MARGIN_FALLBACK;
}
function getViewport() {
  const vw = document.documentElement.clientWidth || window.innerWidth || 1280;
  const vh = window.innerHeight || document.documentElement.clientHeight || 800;
  return { vw, vh };
}
function getSavedWidth() {
  try { return Math.min(MAX_W, Math.max(MIN_W, Number(localStorage.getItem(KEY_W) || '720') || 720)); }
  catch { return 720; }
}
function saveWidth(w) {
  const v = Math.min(MAX_W, Math.max(MIN_W, Math.round(w)));
  try { localStorage.setItem(KEY_W, String(v)); } catch {}
  return v;
}
function saveBounds(wnd) {
  try {
    const b = { x: wnd.getX(), y: wnd.getY(), w: wnd.getWidth(), h: wnd.getHeight() };
    localStorage.setItem(KEY_BOUNDS, JSON.stringify(b));
  } catch {}
}
function getLastBounds() {
  try { return JSON.parse(localStorage.getItem(KEY_BOUNDS) || 'null'); }
  catch { return null; }
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

// UI 提示
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
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text || '');
    else {
      const ta = document.createElement('textarea');
      ta.value = text || '';
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    toast('已复制到剪贴板');
  } catch (e) { alert('复制失败：' + e); }
}
function exportYaml(text, filename = 'diagram.yaml') {
  const ui = window.DFT_CTX;
  if (ui?.saveData) {
    const b64 = btoa(unescape(encodeURIComponent(text || '')));
    ui.saveData(filename, 'yaml', b64, 'text/plain', true);
  } else {
    const blob = new Blob([text || ''], { type: 'text/yaml;charset=utf-8' });
    const a = document.createElement('a');
    a.download = filename; a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 800);
  }
}

// ===== React 代码面板 =====
function CodePanel() {
  const ui = window.DFT_CTX;
  const [yaml, setYaml] = useState('# 加载中…');
  const [loading, setLoading] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    if (codeRef.current) Prism.highlightElement(codeRef.current);
  }, [yaml]);

  useEffect(() => {
    if (!ui) return;
    let alive = true;
    const refresh = () => {
      if (!alive) return;
      try {
        setLoading(true);
        const xml = getLiveXml(ui);
        const out = (typeof convertXmlToyaml === 'function')
          ? convertXmlToyaml(xml, true)
          : '# 缺少 convertXmlToyaml(xml, includeAttrs)';
        if (out && typeof out.then === 'function') {
          out.then(s => alive && setYaml(s || ''))
             .catch(e => alive && setYaml('# YAML 生成失败：' + (e?.message || e)))
             .finally(() => alive && setLoading(false));
        } else {
          setYaml(out || ''); setLoading(false);
        }
      } catch (e) {
        setYaml('# YAML 生成失败：' + (e?.message || e));
        setLoading(false);
      }
    };

    // 初次 + 事件
    refresh();
    const graph = ui.editor.graph, model = graph.getModel(), um = ui.editor.undoManager;
    const kick = () => refresh();
    model.addListener(mxEvent.CHANGE, kick);
    model.addListener(mxEvent.ROOT,   kick);
    um.addListener(mxEvent.ADD,       kick);
    um.addListener(mxEvent.UNDO,      kick);
    um.addListener(mxEvent.REDO,      kick);
    graph.getSelectionModel().addListener(mxEvent.CHANGE, kick);
    try { ui.editor.addListener && ui.editor.addListener('pageSelected', kick); } catch {}

    const t = setInterval(kick, POLL_MS);
    return () => { clearInterval(t); alive = false; };
  }, [ui]);

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
      <div style={{display:'flex', gap:8, alignItems:'center', padding:'6px 8px', borderBottom:'1px solid #e8e8e8', background:'#fafafa'}}>
        <strong>YAML 预览</strong>
        <span style={{color:'#999', marginLeft:6}}>{loading ? '（更新中…）' : ''}</span>
        <div style={{flex:1}} />
        <button onClick={()=>copyText(yaml)} disabled={!yaml || yaml.startsWith('# 缺少')}>复制</button>
        <button onClick={()=>exportYaml(yaml)} disabled={!yaml || yaml.startsWith('# 缺少')}>导出</button>
        <button onClick={()=>{
          const xml = getLiveXml(window.DFT_CTX);
          try {
            const out = convertXmlToyaml(xml, true);
            if (out && typeof out.then === 'function') out.then(s => setYaml(s || ''));
            else setYaml(out || '');
          } catch (e) { setYaml('# YAML 生成失败：' + (e?.message || e)); }
        }}>刷新</button>
      </div>
      <div style={{flex:'1 1 auto', overflow:'auto', padding:'12px 16px'}}>
        <pre style={{margin:0}}>
          <code ref={codeRef} className="language-yaml">{yaml || ''}</code>
        </pre>
      </div>
    </div>
  );
}

// ===== mxWindow：首次停靠，之后自由拖拽/缩放 =====
let _wnd = null;
let _root = null;
let _host = null;
let _didInitialDock = false;     // 仅用于“首次打开时停靠”
let _userInteracted = false;     // 用户拖拽/缩放后为 true（停止任何自动布局）

function initialDock() {
  if (!_wnd) return;
  const { vw, vh } = getViewport();
  const top = getTopOffset();

  const prefW = getSavedWidth();
  const w = Math.min(MAX_W, Math.max(MIN_W, prefW));
  const h = Math.max(180, vh - top - 12);
  const x = Math.max(0, vw - w - RIGHT_MARGIN);
  const y = top;

  _wnd.setSize(w, h);
  _wnd.setLocation(x, y);
}

function ensureWindow() {
  if (_wnd) return;

  _host = document.createElement('div');
  _host.style.cssText = 'width:100%;height:100%;';

  // 如果你希望“二次打开”回到上次位置，可以在这里读 KEY_BOUNDS；这次按“初次停靠”的需求，就不给默认位置：
  const last = getLastBounds();
  const initW = last?.w || getSavedWidth();
  const initH = last?.h || 360;
  const initX = last?.x ?? 100;
  const initY = last?.y ?? 80;

  _wnd = new mxWindow('YAML 预览', _host, initX, initY, initW, initH, true, true);
  _wnd.minimumSize = new mxRectangle(0, 0, MIN_W, 180);
  _wnd.setScrollable(true);
  _wnd.setVisible(false);
  _wnd.destroyOnClose = false;

  // React 渲染
  _root = createRoot(_host);
  _root.render(React.createElement(CodePanel));

  // 监听用户交互：一旦 MOVE/RESIZE，后续不再自动布局
  const onResize = () => {
    _userInteracted = true;
    saveWidth(_wnd.getWidth());
    saveBounds(_wnd);
  };
  const onMove = () => {
    _userInteracted = true;
    saveBounds(_wnd);
  };
  try { _wnd.addListener(mxEvent.RESIZE, onResize); } catch {}
  try { _wnd.addListener(mxEvent.MOVE,   onMove);   } catch {}

  // 可选：左侧6px内置拖拽手柄（仅改宽，不改位置），更好用
  const grip = document.createElement('div');
  grip.title = '拖拽调整宽度';
  grip.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:6px;cursor:ew-resize;z-index:2;background:transparent;';
  _host.appendChild(grip);
  let dragging = false;
  const onMouseDown = (e) => { e.preventDefault(); dragging = true; };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const { vw } = getViewport();
    const right = _wnd.getX() + _wnd.getWidth();
    // 以窗口右侧为固定参考，向左拖改变宽度
    const delta = _wnd.getX() - e.clientX;
    const newW = saveWidth(_wnd.getWidth() + delta);
    _wnd.setSize(newW, _wnd.getHeight());
    _wnd.setLocation(right - newW, _wnd.getY());
    _userInteracted = true;
    saveBounds(_wnd);
  };
  const onMouseUp = () => { dragging = false; };
  grip.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

const API = {
  open() {
    ensureWindow();

    _wnd.setVisible(true);

    // —— 只在“首次 open”时，进行一次右侧停靠 + 满高 —— //
    if (!_didInitialDock) {
      initialDock();
      _didInitialDock = true;

      // 在用户交互发生前，如果窗口大小变化（浏览器 resize），跟随一次即可
      const onWinResize = () => { if (!_userInteracted) initialDock(); };
      window.addEventListener('resize', onWinResize, { once: false });
    }

    _wnd.activate && _wnd.activate();
  },
  close() {
    if (_wnd) _wnd.setVisible(false);
  },
  destroy() {
    if (_root) { _root.unmount(); _root = null; }
    if (_wnd) { try { _wnd.destroy(); } catch {} _wnd = null; }
    if (_host) { _host.remove(); _host = null; }
  }
};

window.DFTPreviewCode = API;
export default API;