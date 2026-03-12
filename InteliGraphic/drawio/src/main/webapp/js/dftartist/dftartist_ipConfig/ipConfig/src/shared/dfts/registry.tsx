import React from 'react';
import DftsModal from './modal';
import { createShadowMount } from './mount';
import type { DftsTypeDef } from './types';
import { getDftsTypeFromCell } from './cell';

declare global {
  interface Window {
    Graph?: any;
    mxGraph?: any;
    mxEvent?: any;
    DftsIP?: any;

    __DFTS_TYPE_REGISTRY__?: Record<string, DftsTypeDef>;
    __DFTS_DBLCLICK_PATCHED__?: boolean;
    __DFTS_POPUP__?: { destroy: () => void };
  }
}

function getRegistry(): Record<string, DftsTypeDef> {
  if (!window.__DFTS_TYPE_REGISTRY__) window.__DFTS_TYPE_REGISTRY__ = {};
  return window.__DFTS_TYPE_REGISTRY__!;
}

function resolvePopupDef(type: string | null): DftsTypeDef | null {
  if (!type) return null;

  const reg = getRegistry();

  // 1) 优先精确命中
  if (reg[type]) return reg[type];

  // 2) 回退到宿主 def 的 category
  const hostDef = window.DftsIP?._defsByType?.[type];
  const category = hostDef?.category;

  if (category && reg[category]) return reg[category];

  return null;
}

function openPopup(def: DftsTypeDef, graph: any, cell: any) {
  try {
    window.__DFTS_POPUP__?.destroy();
  } catch {}

  const sm = createShadowMount('dfts-host');
  const destroy = () => {
    try {
      sm.destroy();
    } finally {
      window.__DFTS_POPUP__ = undefined;
    }
  };

  window.__DFTS_POPUP__ = { destroy };

  sm.root.render(
    <DftsModal
      def={def}
      graph={graph}
      cell={cell}
      shadowRoot={sm.shadowRoot}
      mount={sm.mount}
      onClose={destroy}
    />
  );
}

/** 注册一个 type（每个 type 的 entry.tsx 调一次即可） */
export function registerDftsType(def: DftsTypeDef) {
  const reg = getRegistry();
  reg[def.type] = def;
  patchDblClickOnce();
}

function patchDblClickOnce() {
  if (window.__DFTS_DBLCLICK_PATCHED__) return;
  window.__DFTS_DBLCLICK_PATCHED__ = true;

  function doPatch() {
    const Ctor = window.Graph || window.mxGraph;
    if (!Ctor?.prototype) return false;

    const proto = Ctor.prototype;
    if ((proto as any).__DFTS_PATCHED__) return true;

    const orig = proto.dblClick;

    proto.dblClick = function (evt: any, cell: any) {
      try {
        const graph = this;
        const t = getDftsTypeFromCell(graph, cell);
        const popupDef = resolvePopupDef(t);
        if (popupDef) {
          try {
            window.mxEvent?.consume?.(evt);
          } catch {}
          openPopup(popupDef, graph, cell);
          return;
        }
      } catch (e) {
        console.error('[DFTS] dblClick error:', e);
      }
      return orig?.apply(this, arguments as any);
    };

    (proto as any).__DFTS_PATCHED__ = true;
    return true;
  }

  if (!doPatch()) {
    let tries = 0;
    const t = setInterval(() => {
      if (doPatch() || ++tries >= 400) clearInterval(t);
    }, 50);
  }
}
