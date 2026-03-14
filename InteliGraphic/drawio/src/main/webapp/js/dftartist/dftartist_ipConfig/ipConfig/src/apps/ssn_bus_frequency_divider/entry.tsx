import { registerDftsType } from '../../shared/dfts/registry';
import { ssnDefinition } from './definition';

/**
 * entry.tsx 只做两件事：
 * 1) register 本 type
 * 2) shared registry 里会负责 patch dblClick（且全局只 patch 一次）
 */
registerDftsType(ssnDefinition);
