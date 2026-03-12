import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Drawer, Button } from 'antd';
import AnalysisPanel from '../components/AnalysisPanel.jsx';
import 'antd/dist/reset.css';
import '../styles.css';

let _root = null, _host = null;

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

const API = {
  open() { ensureMount(); _root.render(<AnalysisDrawerApp onClose={API.close}/>); },
  close() { if (_root){ _root.unmount(); _root=null; _host?.remove(); _host=null; } },
  destroy() { API.close(); }
};

window.DFTAnalysis = API;
export default API;