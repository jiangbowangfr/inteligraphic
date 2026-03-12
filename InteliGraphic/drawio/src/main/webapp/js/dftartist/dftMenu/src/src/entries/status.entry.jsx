// src/entries/status.entry.jsx
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal, Button } from 'antd';
import StatusPanel from '../components/StatusPanel.jsx';
import 'antd/dist/reset.css';
import '../styles.css';

let _root = null, _host = null;

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

const API = {
  open(opts = {}) {
    const { title, envName } = opts;
    ensureMount();
    _root.render(<StatusModalApp title={title} envName={envName} onClose={API.close} />);
  },
  close() {
    if (_root) { _root.unmount(); _root = null; }
    if (_host) { _host.remove(); _host = null; }
  },
  destroy() { API.close(); }
};

window.DFTStatus = API;
export default API;
