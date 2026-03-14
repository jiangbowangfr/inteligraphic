// src/apps_t/interface/bisr_slave/definition.ts
import { makeInterfaceDef } from '../common/applySpecialBasics';

export const bisr_slaveDefinition = makeInterfaceDef(
  'bisr_slave_interface',
  'BISR Slave Interface',
  [{"attr": "pdg", "label": "PDG", "kind": "string", "placeholder": "默认为空", "help": "作为引脚名前缀第一段，例如 PDG0_U0_bisr_to_clk。"}, {"attr": "label", "label": "Label", "kind": "string", "placeholder": "默认为空", "help": "作为引脚名前缀第二段，例如 PDG0_U0_bisr_to_clk。"}] as any,
);
