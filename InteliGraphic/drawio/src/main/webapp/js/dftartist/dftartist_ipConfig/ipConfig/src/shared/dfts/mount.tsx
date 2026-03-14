// src/shared/dfts/mount.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';

export type ShadowMount = {
  host: HTMLDivElement;
  shadowRoot: ShadowRoot;
  mount: HTMLDivElement;
  root: ReturnType<typeof createRoot>;
  destroy: () => void;
};

export function createShadowMount(hostId = 'dfts-host'): ShadowMount {
  const host = document.createElement('div');
  host.id = hostId;
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const mount = document.createElement('div');

  // 基础样式（避免 draw.io 全局样式影响 + 给预览区更稳定的字体/布局）
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; }
    .dfts-root { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif; }
  `;

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(mount);

  const root = createRoot(mount);

  const destroy = () => {
    try {
      root.unmount();
    } catch {}
    try {
      host.remove();
    } catch {}
  };

  return { host, shadowRoot, mount, root, destroy };
}
