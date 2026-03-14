import { getDftsTypeFromCell } from '../../shared/dfts/cell';

export type ThirdPartyPort = {
  name: string;
  displayName?: string;
  direction?: string;
  dir?: string;
  range?: string;
  bus?: string;
  busWidth?: number;
  side?: string;
  type?: string;
  pinType?: string;
  order?: number;
  visible?: boolean;
};

export type ThirdPartyItem = {
  id?: string;
  key: string;
  dftsType?: string;
  category?: string;
  scope?: "project" | "software" | string;
  moduleName?: string;
  sourceModuleName?: string;
  sourceFileName?: string;
  sourcePath?: string;
  ports?: ThirdPartyPort[];
  diagnostics?: any[];
  [key: string]: any;
};

declare global {
  interface Window {
    DftsIP?: any;
    DftsThirdPartyStore?: {
      ensureLoaded?: () => Promise<void> | void;
      getAllItems?: () => any[];
      getItemByType?: (type: string) => any | null;
      addOrReplaceGeneratedWrapper?: (payload: {
        sourceItem: any;
        scope: 'project' | 'software';
        moduleName: string;
        verilogText: string;
        iclText: string;
        wrapperPorts: any[];
      }) => Promise<any>;
      focusItem?: (key: string) => void;
      refreshPanel?: () => void;
      insertByKey?: (key: string) => any;
      estimateGeneratedPaths?: (payload: {
        sourceItem: any;
        scope: 'project' | 'software';
        moduleName: string;
      }) => { vPath: string; iclPath: string };
    };
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export async function ensureThirdPartyStoreLoaded() {
  await window.DftsThirdPartyStore?.ensureLoaded?.();
}

export function getThirdPartyStore() {
  return window.DftsThirdPartyStore;
}

export function getThirdPartyItemByType(type: string | null | undefined) {
  const t = String(type || '').trim();
  if (!t) return null;

  const fromStore = window.DftsThirdPartyStore?.getItemByType?.(t);
  if (fromStore) return clone(fromStore);

  const hostDef = window.DftsIP?._defsByType?.[t];
  if (hostDef?.__thirdPartyItem) return clone(hostDef.__thirdPartyItem);
  return null;
}

export function resolveThirdPartySourceItem(graph: any, cell: any) {
  const type = getDftsTypeFromCell(graph, cell);
  return getThirdPartyItemByType(type);
}

export function estimateGeneratedPaths(payload: {
  sourceItem: any;
  scope: 'project' | 'software';
  moduleName: string;
}) {
  return window.DftsThirdPartyStore?.estimateGeneratedPaths?.(payload) || { vPath: '', iclPath: '' };
}

export async function saveGeneratedWrapper(payload: {
  sourceItem: any;
  scope: 'project' | 'software';
  moduleName: string;
  verilogText: string;
  iclText: string;
  wrapperPorts: any[];
}) {
  if (!window.DftsThirdPartyStore?.addOrReplaceGeneratedWrapper) {
    throw new Error('DftsThirdPartyStore.addOrReplaceGeneratedWrapper is unavailable');
  }
  return window.DftsThirdPartyStore.addOrReplaceGeneratedWrapper(payload);
}

export function focusThirdPartyItem(key: string) {
  window.DftsThirdPartyStore?.focusItem?.(key);
}

export function refreshThirdPartyLibraryPanel() {
  window.DftsThirdPartyStore?.refreshPanel?.();
}

export function insertThirdPartyItemByKey(key: string) {
  return window.DftsThirdPartyStore?.insertByKey?.(key);
}

export function readCurrentThirdPartyItem(_def: any, graph: any, cell: any): ThirdPartyItem | null {
  return resolveThirdPartySourceItem(graph, cell);
}

export async function addGeneratedWrapperToLibrary(payload: {
  sourceItem: ThirdPartyItem;
  wrapperModuleName: string;
  scope: 'project' | 'software';
  generated: {
    verilogText: string;
    iclText: string;
    wrapperPorts: any[];
  };
}) {
  const created = await saveGeneratedWrapper({
    sourceItem: payload.sourceItem,
    scope: payload.scope,
    moduleName: payload.wrapperModuleName,
    verilogText: payload.generated.verilogText,
    iclText: payload.generated.iclText,
    wrapperPorts: payload.generated.wrapperPorts,
  });

  try {
    if (created?.key) {
      focusThirdPartyItem(created.key);
      refreshThirdPartyLibraryPanel();
    }
  } catch {}

  return created;
}

export async function insertGeneratedWrapperIntoCanvas(_graph: any, created: any) {
  if (!created?.key) return null;
  return insertThirdPartyItemByKey(created.key);
}