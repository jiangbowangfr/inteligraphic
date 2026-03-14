import { InterfaceFormValues } from './types';

declare global {
  interface Window {
    DftsIP?: {
      updateParamInterface?: (graph: any, body: any, params: Record<string, any>) => void;
    };
    updateParamInterface?: (graph: any, body: any, params: Record<string, any>) => void;
  }
}

function getCellStyleString(cell: any): string {
  if (!cell) return '';
  if (typeof cell.getStyle === 'function') return cell.getStyle() || '';
  return cell.style || '';
}

function parseStyleValue(style: string, key: string): string {
  if (!style) return '';
  const items = style.split(';');
  for (const item of items) {
    const idx = item.indexOf('=');
    if (idx < 0) continue;
    const k = item.slice(0, idx);
    const v = item.slice(idx + 1);
    if (k === key) return v;
  }
  return '';
}

export function getBodyFromCell(graph: any, cell: any): any {
  if (!cell) return null;

  const style = getCellStyleString(cell);
  const isBody = parseStyleValue(style, 'dftsIP_chipBody') === '1';
  if (isBody) return cell;

  let cur = cell;
  while (cur && cur.parent) {
    cur = cur.parent;
    const s = getCellStyleString(cur);
    const body = parseStyleValue(s, 'dftsIP_chipBody') === '1';
    if (body) return cur;
  }

  return cell;
}

export function getDftsTypeFromBody(body: any): string {
  const style = getCellStyleString(body);
  return parseStyleValue(style, 'dftsIP_type');
}

export function getBodyLabel(body: any): string {
  if (!body) return '';
  const raw = typeof body.value === 'string' ? body.value : (body.value?.toString?.() ?? '');
  return String(raw ?? '').trim();
}

export function collectInitialValues(graph: any, body: any): InterfaceFormValues {
  const dftsType = getDftsTypeFromBody(body);
  const bodyLabel = getBodyLabel(body);

  const base: InterfaceFormValues = {
    bodyLabel,
  };

  if (dftsType === 'ssn_host_interface') {
    return { ...base, busWidth: 8 };
  }

  if (dftsType === 'ssn_slave_interface') {
    return { ...base, busWidth: 8, pinLabel: 'U0', deviceLabel: 'U0' };
  }

  if (dftsType === 'bscan_slave_interface') {
    return { ...base, pinLabel: 'U0', deviceLabel: 'U0' };
  }

  if (dftsType === 'ijtag_slave_interface') {
    return { ...base, pinLabel: 'U0', deviceLabel: 'U0' };
  }

  if (dftsType === 'bisr_host_interface') {
    return { ...base, pdg: 'PDG0' };
  }

  if (dftsType === 'bisr_slave_interface') {
    return { ...base, pdg: 'PDG0', pinLabel: 'U0', deviceLabel: 'U0' };
  }

  return base;
}

function normalizePayload(values: InterfaceFormValues): Record<string, any> {
  const payload: Record<string, any> = {};

  if (values.bodyLabel != null) {
    payload.bodyLabel = String(values.bodyLabel).trim();
  }

  if (values.busWidth != null && values.busWidth !== '') {
    const n = Number(values.busWidth);
    if (Number.isFinite(n)) payload.busWidth = Math.max(1, Math.floor(n));
  }

  if (values.pinLabel != null && String(values.pinLabel).trim()) {
    payload.pinLabel = String(values.pinLabel).trim();
  }

  if (values.deviceLabel != null && String(values.deviceLabel).trim()) {
    payload.deviceLabel = String(values.deviceLabel).trim();
  }

  if (values.pdg != null && String(values.pdg).trim()) {
    payload.pdg = String(values.pdg).trim();
  }

  return payload;
}

export function applyInterfaceValues(
  graph: any,
  body: any,
  values: InterfaceFormValues
): void {
  const payload = normalizePayload(values);

  const fn =
    window.DftsIP?.updateParamInterface ||
    window.updateParamInterface;

  if (typeof fn !== 'function') {
    throw new Error(
      '未找到 updateParamInterface。请确认 dftartist_create_interface.js 已加载，并且 global.updateParamInterface 已挂到 window。'
    );
  }

  fn(graph, body, payload);
}
