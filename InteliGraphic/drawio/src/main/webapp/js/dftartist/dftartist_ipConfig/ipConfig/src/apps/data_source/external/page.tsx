import React from 'react';
import { CommonDataSourceForm } from '../common/CommonDataSourceForm';
import { EXTERNAL_DATA_SOURCE_FIELDS } from '../common/schema';

export function ExternalDataSourcePage(props: any) {
  return (
    <CommonDataSourceForm
      {...props}
      config={{
        type: 'external_data_source',
        title: 'External Data Source',
        description: '配置 ExternalDataSource 的 body label、enable / data_out / status 三个 pin 的显示名称，以及 data_out 的总线宽度。',
        fields: EXTERNAL_DATA_SOURCE_FIELDS,
      }}
    />
  );
}
