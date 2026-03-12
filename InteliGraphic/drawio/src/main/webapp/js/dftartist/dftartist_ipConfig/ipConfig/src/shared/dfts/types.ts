// src/shared/dfts/types.ts
import type { ComponentType } from 'react';

export type DftsTypeId = string;
export type DftsCategory = 'dft_ip' | 'logic_gate' | 'interface' | 'data_source' | 'third_party_ip';

export type FieldKind = 'string' | 'number' | 'select' | 'textarea' | 'switch';
export type SelectOption = { label: string; value: string | number | boolean };

export type FieldDef = {
  attr: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  options?: SelectOption[];
  section?: string;
  colSpan?: 12 | 24;
  tooltip?: string;
  unit?: string;
  help?: string;
  visibleWhen?: (values: Record<string, any>) => boolean;
  disabledWhen?: (values: Record<string, any>) => boolean;
  normalize?: (v: any) => any;
  display?: (v: any) => string;
};

export type SpecialFieldKind = 'string' | 'number';

export type SpecialFieldDef = {
  attr: string;
  label: string;
  kind?: SpecialFieldKind;
  defaultValue?: any;
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
};

export type CodeCtx = {
  get: (attr: string, fallback?: any) => any;
  nodeKey: string;
};

export type NodeDef = {
  title: string;
  description?: string;
  fields: FieldDef[];
  buildCode?: (ctx: CodeCtx) => string;
};

export type DftsPinSide = 'west' | 'east' | 'north' | 'south';

export type DftsPinDraft = {
  key: string;
  name: string;
  displayName?: string;
  dir?: 'input' | 'output' | string;
  type?: string;
  busWidth?: number;
  side: DftsPinSide;
  order: number;
  visible: boolean;
};

export type DftsSymbolModel = {
  title?: string;
  instanceName?: string;
  pins: DftsPinDraft[];
  [k: string]: any;
};

export type IpBasicsDraft = {
  bodyLabel: string;
  instanceName: string;
  showInstance: boolean;
  lockBodyLabel: boolean;
  width?: number;
  height?: number;
};

export type BuiltinTabId = 'dft' | 'ip-basic' | 'ip-layout' | 'preview';

export type DftsTypeDef = {
  type: DftsTypeId;
  title: string;
  category?: DftsCategory;
  nodes?: Record<string, NodeDef>;
  defaultNode?: string;
  tabs?: string[];
  extraTabs?: DftsExtraTabDef[];
  specialFields?: SpecialFieldDef[];
  applySpecialBasics?: (ctx: DftsSpecialApplyCtx) => void;
};

export type ExtraTabBaseCtx = {
  def: DftsTypeDef;
  graph: any;
  cell: any;
};

export type DftsExtraTabRenderProps<TDraft = any> = ExtraTabBaseCtx & {
  draft: TDraft;
  setDraft: (next: TDraft) => void;
  basicDraft: IpBasicsDraft;
  setBasicDraft: (next: IpBasicsDraft) => void;
  layoutPins: DftsPinDraft[];
  setLayoutPins: (next: DftsPinDraft[]) => void;
  layoutBaselinePins: DftsPinDraft[];
  setLayoutBaselinePins: (next: DftsPinDraft[]) => void;
};

export type DftsExtraTabApplyProps<TDraft = any> = ExtraTabBaseCtx & {
  draft: TDraft;
  basicDraft: IpBasicsDraft;
  layoutPins: DftsPinDraft[];
};

export type DftsSpecialApplyCtx = ExtraTabBaseCtx & {
  basicDraft: IpBasicsDraft;
  specialDraft: Record<string, any>;
  layoutPins: DftsPinDraft[];
};

export type DftsExtraTabApplyResult = {
  handledSymbol?: boolean;
};

export type DftsExtraTabComponent<TDraft = any> = ComponentType<DftsExtraTabRenderProps<TDraft>>;

export type DftsExtraTabDef<TDraft = any> = {
  id: string;
  label: string;
  initial: (ctx: ExtraTabBaseCtx) => TDraft;
  touchedCount?: (initial: TDraft, draft: TDraft) => number;
  apply?: (ctx: DftsExtraTabApplyProps<TDraft>) => void | DftsExtraTabApplyResult;
  component: DftsExtraTabComponent<TDraft>;
};
