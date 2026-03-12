import { DftsTypeDef, InterfacePageComponent } from './types';

export interface MakeInterfaceDefinitionOptions {
  type: string;
  title: string;
  Page: InterfacePageComponent;
  tabs?: string[];
}

export function makeInterfaceDefinition(
  options: MakeInterfaceDefinitionOptions
): DftsTypeDef {
  return {
    type: options.type,
    title: options.title,
    category: 'interface',
    tabs: options.tabs ?? ['ip-basic', 'ip-layout', 'preview'],
    Page: options.Page,
  };
}
