// src/apps_t/interface/registry.ts
import { registerDftsType } from '../../shared/dfts/registry';
import { ssn_hostDefinition } from './ssn_host/definition';
import { ssn_slaveDefinition } from './ssn_slave/definition';
import { bscan_hostDefinition } from './bscan_host/definition';
import { bscan_slaveDefinition } from './bscan_slave/definition';
import { ijtag_hostDefinition } from './ijtag_host/definition';
import { ijtag_slaveDefinition } from './ijtag_slave/definition';
import { bisr_hostDefinition } from './bisr_host/definition';
import { bisr_slaveDefinition } from './bisr_slave/definition';

let installed = false;

export function registerAllInterfaceTypes() {
  if (installed) return;
  installed = true;
  [
    ssn_hostDefinition,
    ssn_slaveDefinition,
    bscan_hostDefinition,
    bscan_slaveDefinition,
    ijtag_hostDefinition,
    ijtag_slaveDefinition,
    bisr_hostDefinition,
    bisr_slaveDefinition,
  ].forEach(registerDftsType);
}
