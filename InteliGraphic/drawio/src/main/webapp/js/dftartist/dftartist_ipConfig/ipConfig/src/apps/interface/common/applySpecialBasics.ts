// src/apps_t/interface/shared/applySpecialBasics.ts
import type { DftsSpecialApplyCtx, DftsTypeDef, SpecialFieldDef } from '../../../shared/dfts/types';

function callLegacyUpdate(graph: any, cell: any, payload: Record<string, any>) {
  const fn = (window as any).DftsIP?.updateParamInterface || (window as any).updateParamInterface;
  if (typeof fn === 'function') fn(graph, cell, payload);
}

export function interfaceFields(fields: SpecialFieldDef[]): SpecialFieldDef[] {
  return fields;
}

export function applyInterfaceSpecialBasics(ctx: DftsSpecialApplyCtx) {
  const { graph, cell, specialDraft } = ctx;
  const payload: Record<string, any> = {};

  if (specialDraft.label != null && String(specialDraft.label).trim() !== '') {
    payload.label = String(specialDraft.label).trim();
    payload.pinLabel = String(specialDraft.label).trim();
    payload.deviceLabel = String(specialDraft.label).trim();
  }
  if (specialDraft.pdg != null && String(specialDraft.pdg).trim() !== '') {
    payload.pdg = String(specialDraft.pdg).trim();
  }
  if (specialDraft.busWidth != null && specialDraft.busWidth !== '') {
    const n = Number(specialDraft.busWidth);
    if (Number.isFinite(n) && n > 0) payload.busWidth = Math.floor(n);
  }

  callLegacyUpdate(graph, cell, payload);
}

export function makeInterfaceDef(type: string, title: string, specialFields?: SpecialFieldDef[]): DftsTypeDef {
  return {
    type,
    title,
    category: 'interface',
    tabs: ['ip-basic', 'ip-layout', 'preview'],
    specialFields: specialFields || [],
    applySpecialBasics: applyInterfaceSpecialBasics,
  };
}
