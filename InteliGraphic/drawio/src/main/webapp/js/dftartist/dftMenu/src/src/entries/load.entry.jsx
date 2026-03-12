import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Drawer, Space, Button } from 'antd';
import LoadPanel from '../components/LoadPanel.jsx';
import 'antd/dist/reset.css';
import '../styles.css';

let _root = null, _host = null;
const _embeddedRoots = new Map();

function LoadDrawerApp({ onClose }) {
  const [open, setOpen] = useState(true);
  return (
    <Drawer
      title="DFT · Load"
      open={open}
      width={1100}
      onClose={()=>{ setOpen(false); onClose?.(); }}
      extra={<Space>
        <Button onClick={()=>setOpen(false)}>关闭</Button>
      </Space>}
    >
      <LoadPanel />
    </Drawer>
  );
}

function ensureMount() {
  if (_root) return;
  _host = document.createElement('div');
  _host.id = 'dft-load-host';
  document.body.appendChild(_host);
  _root = createRoot(_host);
}

function EmbeddedLoadApp({ context }) {
  const title = context?.title || 'DFT Load';
  const designName = context?.designName || '';
  const envFile = context?.envFile || '';
  return (
    <div className="dft-load-embedded-shell" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #e5e7eb', background: '#fff', color: '#334155', fontSize: 12 }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>{title}</strong>
        {designName ? <span>{designName}</span> : null}
        {envFile ? <span>{envFile}</span> : null}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 12 }}>
        <LoadPanel />
      </div>
    </div>
  );
}

const API = {
  open() {
    ensureMount();
    _root.render(<LoadDrawerApp onClose={API.close} />);
  },
  mount(container, context) {
    if (!container) return;
    let root = _embeddedRoots.get(container);
    if (!root) {
      root = createRoot(container);
      _embeddedRoots.set(container, root);
    }
    root.render(<EmbeddedLoadApp context={context || {}} />);
  },
  unmount(container) {
    const root = container ? _embeddedRoots.get(container) : null;
    if (!root) return;
    root.unmount();
    _embeddedRoots.delete(container);
  },
  close() {
    if (_root) {
      // 简单做法：卸载即可
      _root.unmount(); _root = null;
      _host?.remove(); _host = null;
    }
  },
  destroy() { API.close(); }
};

window.DFTLoad = API;
export default API;