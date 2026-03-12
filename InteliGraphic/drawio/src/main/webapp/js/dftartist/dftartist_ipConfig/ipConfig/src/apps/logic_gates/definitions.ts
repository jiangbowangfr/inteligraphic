// src/apps/logic-gates/definitions.ts
import React from 'react';
import type { DftsTypeDef } from '../../shared/dfts/types';
import RawLogicGateConfigTab from '../../shared/dfts/ui/LogicGateConfigTab';
import { applyLogicGateDraft, readLogicGateDraft, type LogicGateDraft } from '../../shared/dfts/logicGateBridge';

const LogicGateConfigTab: any =
  (RawLogicGateConfigTab as any)?.default || RawLogicGateConfigTab;

const GATES = [
  { type: 'logic_and', title: 'AND' },
  { type: 'logic_or', title: 'OR' },
  { type: 'logic_nand', title: 'NAND' },
  { type: 'logic_nor', title: 'NOR' },
  { type: 'logic_xor', title: 'XOR' },
  { type: 'logic_xnor', title: 'XNOR' },
  { type: 'logic_not', title: 'NOT' },
  { type: 'logic_buf', title: 'BUF' },
  { type: 'logic_mux', title: 'MUX' },
] as const;

function diffCount(initial: LogicGateDraft, draft: LogicGateDraft) {
  return JSON.stringify(initial) === JSON.stringify(draft) ? 0 : 1;
}

function makeDef(type: string, title: string): DftsTypeDef {
  return {
    type,
    title,
    category: 'logic_gate',
    tabs: ['logic', 'ip-basic', 'ip-layout'],
    extraTabs: [
      {
        id: 'logic',
        label: '逻辑配置',
        initial: ({ graph, cell, def }) => readLogicGateDraft(graph, cell, def),
        touchedCount: diffCount,
        apply: ({ graph, cell, def, draft, basicDraft, layoutPins }) => {
          applyLogicGateDraft({ graph, cell, def, draft, basicDraft, layoutPins });
          return { handledSymbol: true };
        },
        component: LogicGateConfigTab,
      },
    ],
  };
}

export const logicGateDefinitions: DftsTypeDef[] = GATES.map((g) => makeDef(g.type, g.title));
