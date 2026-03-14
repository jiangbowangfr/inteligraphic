import { registerDftsType } from '../../shared/dfts/registry';
import { patternDataSourceDefinition } from './pattern/definition';
import { ssnDataSourceDefinition } from './ssn/definition';
import { externalDataSourceDefinition } from './external/definition';

let installed = false;

export function registerAllDataSourceTypes() {
  if (installed) return;
  installed = true;

  registerDftsType(patternDataSourceDefinition);
  registerDftsType(ssnDataSourceDefinition);
  registerDftsType(externalDataSourceDefinition);
}
