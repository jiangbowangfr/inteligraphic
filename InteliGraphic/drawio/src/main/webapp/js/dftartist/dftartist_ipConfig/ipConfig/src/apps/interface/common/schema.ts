import { InterfaceFieldSchema } from './types';

export const commonLabelField: InterfaceFieldSchema = {
  key: 'bodyLabel',
  label: 'Label',
  kind: 'text',
  required: true,
  placeholder: '请输入图元名称',
};

export const busWidthField: InterfaceFieldSchema = {
  key: 'busWidth',
  label: 'Bus Width',
  kind: 'number',
  min: 1,
  step: 1,
  defaultValue: 8,
  placeholder: '例如 8',
};

export const pinLabelField: InterfaceFieldSchema = {
  key: 'pinLabel',
  label: 'Pin Label',
  kind: 'text',
  defaultValue: 'U0',
  placeholder: '例如 U0',
};

export const deviceLabelField: InterfaceFieldSchema = {
  key: 'deviceLabel',
  label: 'Device Label',
  kind: 'text',
  defaultValue: 'U0',
  placeholder: '例如 U0',
};

export const pdgField: InterfaceFieldSchema = {
  key: 'pdg',
  label: 'PDG',
  kind: 'text',
  defaultValue: 'PDG0',
  placeholder: '例如 PDG0',
};

export const SSN_HOST_FIELDS: InterfaceFieldSchema[] = [
  commonLabelField,
  busWidthField,
];

export const SSN_SLAVE_FIELDS: InterfaceFieldSchema[] = [
  commonLabelField,
  busWidthField,
  pinLabelField,
  deviceLabelField,
];

export const BSCAN_HOST_FIELDS: InterfaceFieldSchema[] = [
  commonLabelField,
];

export const BSCAN_SLAVE_FIELDS: InterfaceFieldSchema[] = [
  commonLabelField,
  pinLabelField,
  deviceLabelField,
];

export const IJTAG_HOST_FIELDS: InterfaceFieldSchema[] = [
  commonLabelField,
];

export const IJTAG_SLAVE_FIELDS: InterfaceFieldSchema[] = [
  commonLabelField,
  pinLabelField,
  deviceLabelField,
];

export const BISR_HOST_FIELDS: InterfaceFieldSchema[] = [
  commonLabelField,
  pdgField,
];

export const BISR_SLAVE_FIELDS: InterfaceFieldSchema[] = [
  commonLabelField,
  pdgField,
  pinLabelField,
  deviceLabelField,
];
