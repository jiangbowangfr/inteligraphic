import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Drawer, Button } from 'antd';
import AnalysisPanel from '../components/AnalysisPanel.jsx';
import 'antd/dist/reset.css';
import '../styles.css';

let _root = null, _host = null;
const _embeddedRoots = new Map();

function AnalysisDrawerApp({ onClose }) {
  const [open, setOpen] = useState(true);
  return (
    <Drawer title="DFT · Analysis" width={780} open={open} onClose={()=>{ setOpen(false); onClose?.(); }}>
      <AnalysisPanel />
      <div style={{textAlign:'right', marginTop:12}}><Button onClick={()=>{ setOpen(false); onClose?.(); }}>关闭</Button></div>
    </Drawer>
  );
}

function ensureMount() {
  if (_root) return;
  _host = document.createElement('div');
  _host.id = 'dft-analysis-host';
  document.body.appendChild(_host);
  _root = createRoot(_host);
}

function EmbeddedAnalysisApp({ context }) {
  const title = context?.title || 'DFT · Analysis';
  const subtitle = context?.subtitle || '';
  return (
    <div className="dft-analysis-embedded-shell" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #e5e7eb', background: '#fff', color: '#334155', fontSize: 12 }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 12 }}>
        <AnalysisPanel />
      </div>
    </div>
  );
}

const API = {
  open() { ensureMount(); _root.render(<AnalysisDrawerApp onClose={API.close}/>); },
  mount(container, context) {
    if (!container) return;
    let root = _embeddedRoots.get(container);
    if (!root) {
      root = createRoot(container);
      _embeddedRoots.set(container, root);
    }
    root.render(<EmbeddedAnalysisApp context={context || {}} />);
  },
  unmount(container) {
    const root = container ? _embeddedRoots.get(container) : null;
    if (!root) return;
    root.unmount();
    _embeddedRoots.delete(container);
  },
  close() { if (_root){ _root.unmount(); _root=null; _host?.remove(); _host=null; } },
  destroy() { API.close(); }
};

window.DFTAnalysis = API;
export default API;
