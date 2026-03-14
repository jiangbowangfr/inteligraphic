import React from 'react';

/**
 * 这里尽量做得宽松一点，避免和你现有 app_t 类型系统强耦合。
 * 如果你项目里已经有统一的 DftsTypeDef / DftsPageProps，
 * 可以把这里换成直接 import。
 */

export type DftsCategory =
  | 'dft_ip'
  | 'logic_gate'
  | 'interface'
  | 'data_source'
  | 'third_party_ip';

export interface DftsTypeDef {
  type: string;
  title: string;
  category: DftsCategory;
  tabs?: string[];
  Page: React.ComponentType<DftsPageProps>;
}

export interface DftsPageProps {
  graph: any;
  cell: any;
  body?: any;
  close?: () => void;
  onClose?: () => void;
}

export interface InterfaceFormValues {
  bodyLabel: string;
  busWidth?: number;
  pinLabel?: string;
  deviceLabel?: string;
  pdg?: string;
}

export type InterfaceFieldKind = 'text' | 'number';

export interface InterfaceFieldSchema {
  key: keyof InterfaceFormValues;
  label: string;
  kind: InterfaceFieldKind;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  defaultValue?: string | number;
  visible?: (ctx: InterfaceFieldVisibleContext) => boolean;
}

export interface InterfaceFieldVisibleContext {
  dftsType: string;
}

export interface InterfacePageConfig {
  type: string;
  title: string;
  fields: InterfaceFieldSchema[];
}

export type InterfacePageComponent = React.ComponentType<DftsPageProps>;
