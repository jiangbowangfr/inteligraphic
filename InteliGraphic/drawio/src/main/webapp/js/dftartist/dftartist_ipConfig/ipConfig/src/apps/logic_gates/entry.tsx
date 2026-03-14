// src/apps/logic-gates/entry.tsx
import { registerDftsType } from '../../shared/dfts/registry';
import { logicGateDefinitions } from './definitions';

logicGateDefinitions.forEach((def) => registerDftsType(def));
