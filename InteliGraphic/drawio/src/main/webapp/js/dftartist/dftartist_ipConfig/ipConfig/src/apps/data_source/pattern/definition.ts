import { makeDataSourceDefinition } from '../common/base';
import { PatternDataSourcePage } from './page';

export const patternDataSourceDefinition = makeDataSourceDefinition({
  type: 'pattern_data_source',
  title: 'Pattern Data Source',
  Page: PatternDataSourcePage,
});
