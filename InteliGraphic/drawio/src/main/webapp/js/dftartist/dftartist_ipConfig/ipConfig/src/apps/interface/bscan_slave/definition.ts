// src/apps_t/interface/bscan_slave/definition.ts
import { makeInterfaceDef } from '../common/applySpecialBasics';

export const bscan_slaveDefinition = makeInterfaceDef(
  'bscan_slave_interface',
  'BSCAN Slave Interface',
  [{"attr": "label", "label": "Label", "kind": "string", "placeholder": "默认为空", "help": "作为引脚名前缀，例如 U0_bscan_to_clock。"}] as any,
);
