// src/shared/dfts/logicGateBridge.ts
import { getCellAttr, setCellAttr } from './cell';
import type { DftsPinDraft, DftsTypeDef, IpBasicsDraft } from './types';

export type LogicGateDraft = {
  gateKind: string;
  params: {
    inputCount?: number;
    dataInputs?: number;
    busWidth?: number;
    hasEnable?: boolean;
    selectSide?: 'north' | 'south';
  };
  customTitle: string;
  instanceName: string;
  invertOutput: boolean;
  pinOverrides: Record<string, any>;
};

function parseStyle(raw?: string | null, key?: string) {
  if (!raw || !key) return null;
  for (const seg of String(raw).split(';')) {
    if (!seg) continue;
    const idx = seg.indexOf('=');
    if (idx <= 0) continue;
    const k = seg.slice(0, idx).trim();
    if (k === key) return seg.slice(idx + 1).trim();
  }
  return null;
}

function getRawStyle(graph: any, cell: any) {
  try {
    const model = graph.getModel ? graph.getModel() : graph.model;
    return (model?.getStyle ? model.getStyle(cell) : undefined) ?? cell?.style ?? '';
  } catch {
    return cell?.style ?? '';
  }
}

function getNs() {
  return (window as any).DftsIP || {};
}

function getLogicModel() {
  return getNs()?.LogicGate?.Model;
}

function getDefinitionByKey(key: string) {
  const ns = getNs();
  if (!key) return null;
  try {
    if (typeof ns.getDefinitionByKey === 'function') return ns.getDefinitionByKey(key);
  } catch {}
  return (ns._defsByKey && ns._defsByKey[key]) || null;
}

function getDefinitionByType(type: string) {
  const ns = getNs();
  if (!type) return null;
  return (ns._defsByType && ns._defsByType[type]) || null;
}

export function findLogicGateDefinition(graph: any, cell: any, def?: DftsTypeDef) {
  const defKey =
    getCellAttr(graph, cell, 'dftsIP_defKey', null) ||
    parseStyle(getRawStyle(graph, cell), 'dftsIP_defKey') ||
    '';
  const fromKey = getDefinitionByKey(String(defKey || ''));
  if (fromKey) return fromKey;

  const byType = getDefinitionByType(String(def?.type || getCellAttr(graph, cell, 'dftsIP_type', '') || ''));
  if (byType) return byType;

  return null;
}

function defaultDraft(graph: any, cell: any, def?: DftsTypeDef): LogicGateDraft {
  const fallbackType = String(def?.type || getCellAttr(graph, cell, 'dftsIP_type', 'logic_and') || 'logic_and');
  const map: Record<string, string> = {
    logic_and: 'and',
    logic_or: 'or',
    logic_nand: 'nand',
    logic_nor: 'nor',
    logic_xor: 'xor',
    logic_xnor: 'xnor',
    logic_not: 'not',
    logic_buf: 'buf',
    logic_mux: 'mux',
  };
  const gateKind = map[fallbackType] || 'and';
  return {
    gateKind,
    params: gateKind === 'mux' ? { dataInputs: 2, busWidth: 1, hasEnable: false, selectSide: 'south' } : { inputCount: gateKind === 'not' || gateKind === 'buf' ? 1 : 2, busWidth: 1 },
    customTitle: '',
    instanceName: '',
    invertOutput: false,
    pinOverrides: {},
  };
}

export function readLogicGateDraft(graph: any, cell: any, def?: DftsTypeDef): LogicGateDraft {
  const model = getLogicModel();
  const lgDef = findLogicGateDefinition(graph, cell, def);

  if (model?.readStateFromBody) {
    try {
      const state = model.readStateFromBody(graph, cell, lgDef || {});
      if (state) {
        return {
          gateKind: String(state.gateKind || lgDef?.gateKind || 'and'),
          params: { ...(state.params || {}) },
          customTitle: String(state.customTitle || ''),
          instanceName: String(state.instanceName || ''),
          invertOutput: !!state.invertOutput,
          pinOverrides: { ...(state.pinOverrides || {}) },
        };
      }
    } catch (e) {
      console.warn('[DFTS] readLogicGateDraft fallback:', e);
    }
  }

  return defaultDraft(graph, cell, def);
}

function clonePins(pins: DftsPinDraft[]) {
  return (pins || []).map((p) => ({ ...p }));
}

export function buildLogicGatePins(graph: any, cell: any, draft: LogicGateDraft, currentPins: DftsPinDraft[], def?: DftsTypeDef): DftsPinDraft[] {
  const model = getLogicModel();
  const lgDef = findLogicGateDefinition(graph, cell, def) || { gateKind: draft.gateKind, defaultParams: draft.params, defaultLabel: String(draft.gateKind || '').toUpperCase() };

  if (model?.buildSymbolModel) {
    try {
      const symbolModel = model.buildSymbolModel(
        lgDef,
        {
          ...draft,
          prevPins: clonePins(currentPins),
          pinOverrides: model.toOverrideMap ? model.toOverrideMap(clonePins(currentPins)) : draft.pinOverrides || {},
        },
        {},
      );
      const pins = Array.isArray(symbolModel?.pins) ? symbolModel.pins : [];
      return pins.map((p: any, idx: number) => ({
        key: String(p.key || p.name || `pin_${idx}`),
        name: String(p.name || p.displayName || p.key || `pin_${idx}`),
        displayName: p.displayName != null ? String(p.displayName) : undefined,
        dir: p.dir || p.direction || undefined,
        type: p.type || undefined,
        busWidth: Number(p.busWidth || p.bus || 1) || 1,
        side: (p.side || 'west') as any,
        order: Number(p.order ?? idx) || 0,
        visible: p.visible == null ? true : !!p.visible,
      }));
    } catch (e) {
      console.warn('[DFTS] buildLogicGatePins fallback:', e);
    }
  }

  return clonePins(currentPins);
}

function encodeModel(model: any) {
  try {
    return encodeURIComponent(JSON.stringify(model));
  } catch {
    return '';
  }
}

export function applyLogicGateDraft(args: {
  graph: any;
  cell: any;
  def?: DftsTypeDef;
  draft: LogicGateDraft;
  basicDraft: IpBasicsDraft;
  layoutPins: DftsPinDraft[];
}) {
  const { graph, cell, def, draft, basicDraft, layoutPins } = args;
  const model = getLogicModel();
  const ns = getNs();
  const lgDef = findLogicGateDefinition(graph, cell, def) || { gateKind: draft.gateKind, defaultParams: draft.params };

  const nextState = {
    ...draft,
    gateKind: draft.gateKind,
    params: { ...(draft.params || {}) },
    customTitle: basicDraft.bodyLabel || draft.customTitle || '',
    instanceName: basicDraft.instanceName || draft.instanceName || '',
    pinOverrides: model?.toOverrideMap ? model.toOverrideMap(layoutPins) : draft.pinOverrides || {},
  };

  if (model?.writeStateToBody) {
    try {
      model.writeStateToBody(graph, cell, lgDef, nextState);
    } catch (e) {
      console.warn('[DFTS] writeStateToBody fallback:', e);
    }
  }

  if (model?.buildSymbolModel) {
    try {
      const symbolModel = model.buildSymbolModel(lgDef, { ...nextState, prevPins: layoutPins }, {});
      if (ns?.Symbol?.setModel) {
        ns.Symbol.setModel(cell, symbolModel);
        ns.Symbol.relayout?.(graph, cell);
        graph.refresh?.(cell);
      } else {
        setCellAttr(graph, cell, 'dftsIP_symbolModel', encodeModel(symbolModel));
      }
    } catch (e) {
      console.warn('[DFTS] buildSymbolModel/apply fallback:', e);
    }
  }
}
