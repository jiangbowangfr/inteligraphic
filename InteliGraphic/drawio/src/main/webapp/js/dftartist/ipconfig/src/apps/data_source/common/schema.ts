import type { DataSourceFieldSchema } from './types';

export const bodyLabelField: DataSourceFieldSchema = {
  key: 'bodyLabel',
  label: 'Label',
  kind: 'text',
  required: true,
  placeholder: '请输入图元名称',
};

export const busWidthField: DataSourceFieldSchema = {
  key: 'busWidth',
  label: 'Bus Width',
  kind: 'number',
  required: true,
  min: 1,
  step: 1,
  defaultValue: 8,
  placeholder: '例如 8 / 16',
};

export const outputPinLabelField: DataSourceFieldSchema = {
  key: 'outputPinLabel',
  label: 'Output Pin Label',
  kind: 'text',
  placeholder: '输出 pin 名称',
};

export const inputPinLabelField: DataSourceFieldSchema = {
  key: 'inputPinLabel',
  label: 'Input Pin Label',
  kind: 'text',
  placeholder: '输入 pin 名称',
};

export const reqPinLabelField: DataSourceFieldSchema = {
  key: 'reqPinLabel',
  label: 'Request Pin Label',
  kind: 'text',
  placeholder: '例如 data_req',
};

export const enablePinLabelField: DataSourceFieldSchema = {
  key: 'enablePinLabel',
  label: 'Enable Pin Label',
  kind: 'text',
  placeholder: '例如 enable',
};

export const validPinLabelField: DataSourceFieldSchema = {
  key: 'validPinLabel',
  label: 'Valid Pin Label',
  kind: 'text',
  placeholder: '例如 pattern_valid',
};

export const statusPinLabelField: DataSourceFieldSchema = {
  key: 'statusPinLabel',
  label: 'Status Pin Label',
  kind: 'text',
  placeholder: '例如 status',
};

export const PATTERN_DATA_SOURCE_FIELDS: DataSourceFieldSchema[] = [
  bodyLabelField,
  busWidthField,
  outputPinLabelField,
  validPinLabelField,
];

export const SSN_DATA_SOURCE_FIELDS: DataSourceFieldSchema[] = [
  bodyLabelField,
  busWidthField,
  reqPinLabelField,
  outputPinLabelField,
  inputPinLabelField,
];

export const EXTERNAL_DATA_SOURCE_FIELDS: DataSourceFieldSchema[] = [
  bodyLabelField,
  busWidthField,
  enablePinLabelField,
  outputPinLabelField,
  statusPinLabelField,
];
