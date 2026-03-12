import { makeDataSourceDefinition } from '../common/base';
import { ExternalDataSourcePage } from './page';

export const externalDataSourceDefinition = makeDataSourceDefinition({
  type: 'external_data_source',
  title: 'External Data Source',
  Page: ExternalDataSourcePage,
});
