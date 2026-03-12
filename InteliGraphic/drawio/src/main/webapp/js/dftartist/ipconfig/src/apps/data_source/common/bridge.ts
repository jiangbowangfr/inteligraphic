import type { DataSourceFormValues, DataSourceType } from './types';

declare global {
  interface Window {
    DftsIP?: {
      getPinSide?: (graph: any, pin: any) => string;
      getPinT?: (graph: any, pin: any) => number;
      setLinePinSideAndT?: (
        graph: any,
        pin: any,
        side: string,
        t: number,
        opt?: Record<string, any>
      ) => void;
      setPinLabelText?: (graph: any, pin: any, text: string) => void;
    };
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

function isPinCell(cell: any): boolean {
  const style = getCellStyleString(cell);
  return parseStyleValue(style, 'dftsIP_pin') === '1' || parseStyleValue(style, 'pin') === '1';
}

function getChildren(cell: any): any[] {
  if (!cell) return [];
  const cc = cell.children;
  return Array.isArray(cc) ? cc : [];
}

export function getBodyFromCell(graph: any, cell: any): any {
  if (!cell) return null;

  let cur = cell;
  while (cur) {
    const style = getCellStyleString(cur);
    if (parseStyleValue(style, 'dftsIP_chipBody') === '1') return cur;
    cur = cur.parent;
  }

  return cell;
}

export function getDftsTypeFromBody(body: any): DataSourceType | '' {
  const style = getCellStyleString(body);
  return parseStyleValue(style, 'dftsIP_type') as DataSourceType | '';
}

export function getBodyLabel(body: any): string {
  if (!body) return '';
  const v = body.value;
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

export function listPins(body: any): any[] {
  return getChildren(body).filter(isPinCell);
}

export function findPinByKey(body: any, pinKey: string): any | null {
  for (const pin of listPins(body)) {
    const style = getCellStyleString(pin);
    if (parseStyleValue(style, 'dftsIP_pinKey') === pinKey) return pin;
  }
  return null;
}

function setCellValue(graph: any, cell: any, nextValue: string) {
  const model = graph.getModel();
  model.beginUpdate();
  try {
    model.setValue(cell, nextValue);
  } finally {
    model.endUpdate();
  }
}

function setPinLabelText(graph: any, pin: any, text: string) {
  const fn = window.DftsIP?.setPinLabelText;
  if (typeof fn === 'function') {
    fn(graph, pin, text);
    return;
  }

  const labelCell = getChildren(pin).find((ch) => {
    const style = getCellStyleString(ch);
    return parseStyleValue(style, 'dftsIP_pin_label') === '1';
  });

  if (labelCell) {
    setCellValue(graph, labelCell, text);
  }
}

function refreshPinBusWidth(graph: any, pin: any, busWidth: number) {
  const side = window.DftsIP?.getPinSide?.(graph, pin) || parseStyleValue(getCellStyleString(pin), 'dftsIP_pin_location') || 'east';
  const t = window.DftsIP?.getPinT?.(graph, pin);
  const numericT = typeof t === 'number' && !Number.isNaN(t) ? t : 0.5;

  if (typeof window.DftsIP?.setLinePinSideAndT === 'function') {
    window.DftsIP.setLinePinSideAndT(graph, pin, side, numericT, {
      busWidth,
      isBus: busWidth > 1,
    });
    return;
  }

  graph.setCellStyles('dftsIP_busWidth', String(busWidth), [pin]);
  graph.setCellStyles('dftsIP_isBus', String(busWidth > 1 ? 1 : 0), [pin]);
  graph.setCellStyles('strokeWidth', String(busWidth > 1 ? 3 : 1), [pin]);
}

function defaultValuesByType(type: DataSourceType): DataSourceFormValues {
  switch (type) {
    case 'pattern_data_source':
      return {
        bodyLabel: 'PatternDataSource',
        busWidth: 8,
        outputPinLabel: 'pattern_data_out',
        validPinLabel: 'pattern_valid',
      };
    case 'ssn_data_source':
      return {
        bodyLabel: 'SSNPadSource',
        busWidth: 8,
        reqPinLabel: 'data_req',
        outputPinLabel: 'data_out',
        inputPinLabel: 'data_in',
      };
    case 'external_data_source':
      return {
        bodyLabel: 'ExternalDataSource',
        busWidth: 16,
        enablePinLabel: 'enable',
        outputPinLabel: 'data_out',
        statusPinLabel: 'status',
      };
    default:
      return { bodyLabel: '' };
  }
}

export function collectInitialValues(graph: any, body: any): DataSourceFormValues {
  const type = getDftsTypeFromBody(body);
  const defaults = defaultValuesByType(type as DataSourceType);
  const next: DataSourceFormValues = {
    ...defaults,
    bodyLabel: getBodyLabel(body) || defaults.bodyLabel,
  };

  if (type === 'pattern_data_source') {
    const p0 = findPinByKey(body, 'pattern_data_out');
    const p1 = findPinByKey(body, 'pattern_valid');
    if (p0) next.outputPinLabel = getPinDisplayText(p0) || defaults.outputPinLabel;
    if (p1) next.validPinLabel = getPinDisplayText(p1) || defaults.validPinLabel;
    next.busWidth = getPinBusWidth(p0) || defaults.busWidth;
  }

  if (type === 'ssn_data_source') {
    const pReq = findPinByKey(body, 'data_req');
    const pOut = findPinByKey(body, 'ssn_data_out');
    const pIn = findPinByKey(body, 'ssn_data_in');
    if (pReq) next.reqPinLabel = getPinDisplayText(pReq) || defaults.reqPinLabel;
    if (pOut) next.outputPinLabel = getPinDisplayText(pOut) || defaults.outputPinLabel;
    if (pIn) next.inputPinLabel = getPinDisplayText(pIn) || defaults.inputPinLabel;
    next.busWidth = getPinBusWidth(pOut) || defaults.busWidth;
  }

  if (type === 'external_data_source') {
    const pEnable = findPinByKey(body, 'enable');
    const pOut = findPinByKey(body, 'data_out');
    const pStatus = findPinByKey(body, 'status');
    if (pEnable) next.enablePinLabel = getPinDisplayText(pEnable) || defaults.enablePinLabel;
    if (pOut) next.outputPinLabel = getPinDisplayText(pOut) || defaults.outputPinLabel;
    if (pStatus) next.statusPinLabel = getPinDisplayText(pStatus) || defaults.statusPinLabel;
    next.busWidth = getPinBusWidth(pOut) || defaults.busWidth;
  }

  return next;
}

function getPinDisplayText(pin: any): string {
  const labelCell = getChildren(pin).find((ch) => {
    const style = getCellStyleString(ch);
    return parseStyleValue(style, 'dftsIP_pin_label') === '1';
  });

  if (!labelCell) return '';
  const v = labelCell.value;
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

function getPinBusWidth(pin: any): number | undefined {
  if (!pin) return undefined;
  const style = getCellStyleString(pin);
  const raw = parseStyleValue(style, 'dftsIP_busWidth');
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function normalizeBusWidth(input: any, fallback: number): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.floor(n));
}

export function applyDataSourceValues(graph: any, body: any, values: DataSourceFormValues): void {
  const type = getDftsTypeFromBody(body) as DataSourceType;
  const model = graph.getModel();

  model.beginUpdate();
  try {
    const nextLabel = String(values.bodyLabel || '').trim();
    if (nextLabel) {
      model.setValue(body, nextLabel);
    }

    if (type === 'pattern_data_source') {
      const pOut = findPinByKey(body, 'pattern_data_out');
      const pValid = findPinByKey(body, 'pattern_valid');
      const bw = normalizeBusWidth(values.busWidth, 8);
      if (pOut) {
        refreshPinBusWidth(graph, pOut, bw);
        if (values.outputPinLabel?.trim()) setPinLabelText(graph, pOut, values.outputPinLabel.trim());
      }
      if (pValid && values.validPinLabel?.trim()) {
        setPinLabelText(graph, pValid, values.validPinLabel.trim());
      }
    }

    if (type === 'ssn_data_source') {
      const pReq = findPinByKey(body, 'data_req');
      const pOut = findPinByKey(body, 'ssn_data_out');
      const pIn = findPinByKey(body, 'ssn_data_in');
      const bw = normalizeBusWidth(values.busWidth, 8);
      if (pReq && values.reqPinLabel?.trim()) {
        setPinLabelText(graph, pReq, values.reqPinLabel.trim());
      }
      if (pOut) {
        refreshPinBusWidth(graph, pOut, bw);
        if (values.outputPinLabel?.trim()) setPinLabelText(graph, pOut, values.outputPinLabel.trim());
      }
      if (pIn && values.inputPinLabel?.trim()) {
        setPinLabelText(graph, pIn, values.inputPinLabel.trim());
      }
    }

    if (type === 'external_data_source') {
      const pEnable = findPinByKey(body, 'enable');
      const pOut = findPinByKey(body, 'data_out');
      const pStatus = findPinByKey(body, 'status');
      const bw = normalizeBusWidth(values.busWidth, 16);
      if (pEnable && values.enablePinLabel?.trim()) {
        setPinLabelText(graph, pEnable, values.enablePinLabel.trim());
      }
      if (pOut) {
        refreshPinBusWidth(graph, pOut, bw);
        if (values.outputPinLabel?.trim()) setPinLabelText(graph, pOut, values.outputPinLabel.trim());
      }
      if (pStatus && values.statusPinLabel?.trim()) {
        setPinLabelText(graph, pStatus, values.statusPinLabel.trim());
      }
    }
  } finally {
    model.endUpdate();
  }
}
