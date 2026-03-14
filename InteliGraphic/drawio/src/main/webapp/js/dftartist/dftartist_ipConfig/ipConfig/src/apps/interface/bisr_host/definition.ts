// src/apps_t/interface/bisr_host/definition.ts
import { makeInterfaceDef } from '../common/applySpecialBasics';

export const bisr_hostDefinition = makeInterfaceDef(
  'bisr_host_interface',
  'BISR Host Interface',
  [{"attr": "pdg", "label": "PDG", "kind": "string", "placeholder": "默认为空", "help": "作为引脚名前缀，例如 PDG0_bisr_clk。"}] as any,
);
