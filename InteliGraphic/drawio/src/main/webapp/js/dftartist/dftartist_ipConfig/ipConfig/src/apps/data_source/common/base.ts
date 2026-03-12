import type { DftsTypeDef } from '../../../shared/dfts/types';

export interface MakeDataSourceDefinitionOptions {
  type: 'pattern_data_source' | 'ssn_data_source' | 'external_data_source';
  title: string;
  Page: any;
  tabs?: string[];
}

export function makeDataSourceDefinition(
  options: MakeDataSourceDefinitionOptions
): DftsTypeDef {
  return {
    type: options.type,
    title: options.title,
    category: 'data_source',
    tabs: options.tabs ?? ['ip-basic', 'ip-layout', 'preview'],
    Page: options.Page,
  } as DftsTypeDef;
}
