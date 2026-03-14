// src/entries/status.entry.jsx
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal, Button } from 'antd';
import StatusPanel from '../components/StatusPanel.jsx';
import 'antd/dist/reset.css';
import '../styles.css';

let _root = null, _host = null;
const _embeddedRoots = new Map();

function StatusModalApp({ onClose, title = 'DFT · Status', envName }) {
  const [open, setOpen] = useState(true);
  return (
    <Modal
      title={title}
      centered
      open={open}
      width="90vw"
      styles={{ content: { height: '90vh', padding: 16 }, body: { height: 'calc(90vh - 120px)', overflow: 'auto' } }}
      maskClosable
      destroyOnClose
      getContainer={_host}
      footer={<div style={{ textAlign: 'right' }}><Button onClick={() => { setOpen(false); onClose?.(); }}>关闭</Button></div>}
      onCancel={() => { setOpen(false); onClose?.(); }}
      afterClose={() => { onClose?.(); }}
    >
      <StatusPanel envName={envName} />
    </Modal>
  );
}

function ensureMount() {
  if (_root) return;
  _host = document.createElement('div');
  _host.id = 'dft-status-host';
  document.body.appendChild(_host);
  _root = createRoot(_host);
}

function EmbeddedStatusApp({ context }) {
  const title = context?.title || 'DFT · Status';
  const subtitle = context?.subtitle || '';
  const envName = context?.envName || '';
  return (
    <div className="dft-status-embedded-shell" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #e5e7eb', background: '#fff', color: '#334155', fontSize: 12 }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 12 }}>
        <StatusPanel envName={envName} />
      </div>
    </div>
  );
}

const API = {
  open(opts = {}) {
    const { title, envName } = opts;
    ensureMount();
    _root.render(<StatusModalApp title={title} envName={envName} onClose={API.close} />);
  },
  mount(container, context) {
    if (!container) return;
    let root = _embeddedRoots.get(container);
    if (!root) {
      root = createRoot(container);
      _embeddedRoots.set(container, root);
    }
    root.render(<EmbeddedStatusApp context={context || {}} />);
  },
  unmount(container) {
    const root = container ? _embeddedRoots.get(container) : null;
    if (!root) return;
    root.unmount();
    _embeddedRoots.delete(container);
  },
  close() {
    if (_root) { _root.unmount(); _root = null; }
    if (_host) { _host.remove(); _host = null; }
  },
  destroy() { API.close(); }
};

window.DFTStatus = API;
export default API;
