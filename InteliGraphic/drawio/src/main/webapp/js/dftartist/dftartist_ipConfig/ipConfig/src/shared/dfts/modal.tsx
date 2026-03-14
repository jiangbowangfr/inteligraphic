// src/shared/dfts/modal.tsx
import React, { useState } from 'react';
import { App as AntApp, ConfigProvider, Modal, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { StyleProvider } from '@ant-design/cssinjs';

import type { DftsTypeDef } from './types';
import DftsTypeShell from './ui/DftsTypeShell';

export default function DftsModal(props: {
  def: DftsTypeDef;
  graph: any;
  cell: any;
  shadowRoot: ShadowRoot;
  mount: HTMLElement;
  onClose: () => void;
}) {
  const { def, graph, cell, shadowRoot, mount, onClose } = props;
  const [open, setOpen] = useState(true);

  const close = () => {
    setOpen(false);
    onClose();
  };

  return (
    <ConfigProvider
      locale={zhCN}
      prefixCls="dfts"
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563EB',
          colorInfo: '#2563EB',
          borderRadius: 12,
          borderRadiusLG: 14,
          colorBgLayout: '#F8FAFC',
          colorBgContainer: '#FFFFFF',
          colorBorder: '#E2E8F0',
          colorText: '#0F172A',
          colorTextSecondary: '#475569',
          fontSize: 14,
          fontSizeLG: 16,
          controlHeight: 38,
          controlHeightLG: 42,
          boxShadowSecondary:
            '0 24px 64px rgba(15, 23, 42, 0.18), 0 8px 24px rgba(15, 23, 42, 0.12)',
        },
      }}
      getPopupContainer={() => mount}
    >
      <StyleProvider container={shadowRoot}>
        <AntApp>
          <style>{`
            .dfts-config-modal .dfts-modal-content {
              padding: 0 !important;
              overflow: hidden;
              background: #F8FAFC;
            }
            .dfts-config-modal .dfts-modal-close {
              top: 18px;
              right: 20px;
            }
            .dfts-config-modal .dfts-modal-mask {
              backdrop-filter: blur(2px);
            }
            .dfts-config-modal .dfts-tabs-nav {
              margin: 0 !important;
              padding: 0 24px;
              background: #FFFFFF;
              border-bottom: 1px solid #E2E8F0;
            }
            .dfts-config-modal .dfts-tabs-tab {
              padding: 14px 4px !important;
              margin-right: 28px !important;
              font-weight: 500;
            }
            .dfts-config-modal .dfts-tabs-ink-bar {
              height: 3px !important;
              border-radius: 999px;
            }
            .dfts-config-modal .dfts-tree .dfts-tree-node-content-wrapper {
              width: calc(100% - 6px);
              padding: 6px 8px !important;
              border-radius: 10px;
              transition: background 0.18s ease;
            }
            .dfts-config-modal .dfts-tree .dfts-tree-node-content-wrapper:hover {
              background: #EFF6FF;
            }
            .dfts-config-modal .dfts-tree .dfts-tree-node-content-wrapper.dfts-tree-node-selected,
            .dfts-config-modal .dfts-tree .dfts-tree-treenode-selected > .dfts-tree-node-content-wrapper {
              background: #DBEAFE !important;
              color: #1D4ED8 !important;
            }
            .dfts-config-modal .dfts-tree .dfts-tree-switcher {
              width: 18px !important;
            }
            .dfts-config-modal .dfts-tree .dfts-tree-indent-unit {
              width: 12px !important;
            }
            .dfts-config-modal .dfts-form-item {
              margin-bottom: 18px;
            }
            .dfts-config-modal .dfts-input,
            .dfts-config-modal .dfts-input-number,
            .dfts-config-modal .dfts-select-selector,
            .dfts-config-modal .dfts-input-affix-wrapper,
            .dfts-config-modal .dfts-input-number-affix-wrapper {
              border-radius: 10px !important;
            }
            .dfts-config-modal .dfts-segmented {
              background: #EEF4FF;
              padding: 4px;
              border-radius: 10px;
            }
            .dfts-config-modal .dfts-segmented-item-selected {
              border-radius: 8px !important;
            }
          `}</style>

          <Modal
            className="dfts-config-modal"
            centered
            open={open}
            title={null}
            footer={null}
            width="min(1480px, 96vw)"
            maskClosable
            destroyOnClose
            getContainer={mount}
            styles={{
              content: {
                height: 'min(900px, 92vh)',
              },
              body: {
                height: '100%',
                padding: 0,
                overflow: 'hidden',
              },
            }}
            onCancel={close}
            afterClose={onClose}
          >
            <DftsTypeShell def={def} graph={graph} cell={cell} onClose={close} />
          </Modal>
        </AntApp>
      </StyleProvider>
    </ConfigProvider>
  );
}
