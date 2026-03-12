// src/apps_t/interface/ssn_slave/definition.ts
import { makeInterfaceDef } from '../common/applySpecialBasics';

export const ssn_slaveDefinition = makeInterfaceDef(
  'ssn_slave_interface',
  'SSN Slave Interface',
  [{"attr": "label", "label": "Label", "kind": "string", "placeholder": "默认为空", "help": "作为引脚名前缀，例如 U0_ssn_to_bus_clock。"}, {"attr": "busWidth", "label": "Bus Width", "kind": "number", "placeholder": "默认为32", "help": "用于 data_in/data_out 的总线宽度。", "min": 1}] as any,
);
