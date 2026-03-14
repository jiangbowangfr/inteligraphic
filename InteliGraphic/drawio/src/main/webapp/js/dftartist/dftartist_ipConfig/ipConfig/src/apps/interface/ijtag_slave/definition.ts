// src/apps_t/interface/ijtag_slave/definition.ts
import { makeInterfaceDef } from '../common/applySpecialBasics';

export const ijtag_slaveDefinition = makeInterfaceDef(
  'ijtag_slave_interface',
  'IJTAG Slave Interface',
  [{"attr": "label", "label": "Label", "kind": "string", "placeholder": "默认为空", "help": "作为引脚名前缀，例如 U0_ijtag_to_tck。"}] as any,
);
