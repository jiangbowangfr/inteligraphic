// src/apps_t/interface/ssn_host/definition.ts
import { makeInterfaceDef } from '../common/applySpecialBasics';

export const ssn_hostDefinition = makeInterfaceDef(
  'ssn_host_interface',
  'SSN Host Interface',
  [{"attr": "busWidth", "label": "Bus Width", "kind": "number", "placeholder": "默认为空，内部按 4 处理", "help": "用于 ssn_bus_data_in/out 的总线宽度。", "min": 1}] as any,
);
