export type DataSourceType =
  | 'pattern_data_source'
  | 'ssn_data_source'
  | 'external_data_source';

export interface DataSourceFormValues {
  bodyLabel: string;

  busWidth?: number;

  outputPinLabel?: string;
  inputPinLabel?: string;
  reqPinLabel?: string;
  enablePinLabel?: string;
  validPinLabel?: string;
  statusPinLabel?: string;
}

export type DataSourceFieldKind = 'text' | 'number';

export interface DataSourceFieldSchema {
  key: keyof DataSourceFormValues;
  label: string;
  kind: DataSourceFieldKind;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  defaultValue?: string | number;
}

export interface DataSourcePageConfig {
  type: DataSourceType;
  title: string;
  description: string;
  fields: DataSourceFieldSchema[];
}
